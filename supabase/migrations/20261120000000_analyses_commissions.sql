-- Fase 1: historial de análisis, agregados para el Panel y reportes de comisión.
-- Reglas de negocio intactas: Valor subtotal local, solo Aprobada, NCE restan,
-- montos en centavos (bigint) y cantidades agrupadas siempre por (item, unit).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- datasets: ciclo de vida de la carga
-- ---------------------------------------------------------------------------
alter table public.datasets
  add column if not exists status text not null default 'processing'
    check (status in ('processing', 'ready', 'failed')),
  add column if not exists uploaded_by text not null default 'admin',
  add column if not exists storage_path text null;

comment on column public.datasets.status is
  'Solo ready cuenta en agregados y en la detección de solapes.';
comment on column public.datasets.storage_path is
  'Ruta del XLSX en Storage; nulo si no hay bucket configurado.';

-- ---------------------------------------------------------------------------
-- sale_lines: id estable de línea para selección y reasignación
-- ---------------------------------------------------------------------------
alter table public.sale_lines add column if not exists line_no integer;

-- Backfill para instalaciones con datos: posición estable dentro de cada dataset.
with numbered as (
  select id, row_number() over (partition by dataset_id order by created_at, id) as n
  from public.sale_lines
)
update public.sale_lines as sl
   set line_no = numbered.n
  from numbered
 where sl.id = numbered.id and sl.line_no is null;

alter table public.sale_lines alter column line_no set not null;

alter table public.sale_lines
  add constraint sale_lines_dataset_id_line_no_key unique (dataset_id, line_no);

comment on column public.sale_lines.line_no is
  'Posición de la línea en el archivo. Id usado por selección y reasignación.';

-- ---------------------------------------------------------------------------
-- analyses: historial inmutable de análisis (uno activo por mes)
-- ---------------------------------------------------------------------------
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid null references public.datasets (id) on delete set null,
  period_month date not null,
  period_start date not null,
  period_end date not null,
  file_name text not null,
  file_hash text not null,
  quality_report jsonb not null default '{}'::jsonb,
  kpis jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'superseded')),
  superseded_by uuid null references public.analyses (id) on delete set null,
  created_by text not null default 'admin',
  created_at timestamptz not null default now(),
  constraint analyses_period_order check (period_start <= period_end),
  constraint analyses_month_is_first check (
    period_month = date_trunc('month', period_month)::date
  )
);

create unique index if not exists analyses_one_active_per_month
  on public.analyses (period_month) where status = 'active';
create index if not exists analyses_dataset_id_idx on public.analyses (dataset_id);
create index if not exists analyses_period_month_idx on public.analyses (period_month);
create index if not exists analyses_created_at_idx on public.analyses (created_at desc);

comment on table public.analyses is
  'Historial inmutable: un análisis activo por mes; los reemplazados quedan superseded.';
comment on column public.analyses.snapshot is
  'Rankings por defecto calculados con las funciones puras al guardar.';

-- ---------------------------------------------------------------------------
-- commission_reports: append-only
-- ---------------------------------------------------------------------------
create table if not exists public.commission_reports (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete restrict,
  version integer not null check (version > 0),
  seller_key text not null,
  own_rate numeric(12, 6) not null,
  team_rate numeric(12, 6) not null,
  advance_cents bigint not null default 0 check (advance_cents >= 0),
  inputs jsonb not null,
  result jsonb not null,
  warnings jsonb not null default '[]'::jsonb,
  created_by text not null default 'admin',
  created_at timestamptz not null default now(),
  constraint commission_reports_analysis_version_key unique (analysis_id, version)
);

create index if not exists commission_reports_analysis_version_idx
  on public.commission_reports (analysis_id, version desc);

comment on column public.commission_reports.inputs is
  'Filtro de vendedores, líneas seleccionadas y reasignaciones con detalle completo.';
comment on column public.commission_reports.result is
  'Recalculado en el servidor; nunca se fidean cifras del cliente.';

create or replace function public.prevent_commission_report_changes()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'commission_reports es append-only: UPDATE y DELETE no permitidos'
    using errcode = 'integrity_constraint_violation';
end;
$$;

drop trigger if exists commission_reports_no_update on public.commission_reports;
create trigger commission_reports_no_update
  before update on public.commission_reports
  for each row execute function public.prevent_commission_report_changes();

drop trigger if exists commission_reports_no_delete on public.commission_reports;
create trigger commission_reports_no_delete
  before delete on public.commission_reports
  for each row execute function public.prevent_commission_report_changes();

alter table public.analyses enable row level security;
alter table public.commission_reports enable row level security;

-- ---------------------------------------------------------------------------
-- RPC de agregación. Todos filtran datasets.status = 'ready'.
-- Los montos se devuelven como bigint; los ratios como numeric exacto.
-- ---------------------------------------------------------------------------

create or replace function public.panel_summary(p_year integer)
returns table (
  net_sales_cents bigint,
  gross_sales_cents bigint,
  returns_cents bigint,
  return_rate numeric,
  documents bigint,
  clients bigint,
  avg_ticket_cents bigint,
  weighted_margin numeric,
  last_date date,
  previous_net_sales_cents bigint,
  previous_last_date date
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_year_start date := make_date(p_year, 1, 1);
  v_next_start date := make_date(p_year + 1, 1, 1);
  v_prev_start date := make_date(p_year - 1, 1, 1);
  v_last date;
  v_prev_last date;
  v_net bigint;
  v_gross bigint;
  v_returns bigint;
  v_docs bigint;
  v_clients bigint;
  v_ticket bigint;
  v_margin numeric;
  v_prev_net bigint;
  v_docs_sales bigint;
begin
  select max(sl.date) into v_last
    from public.sale_lines sl
    join public.datasets d on d.id = sl.dataset_id
   where d.status = 'ready'
     and sl.date >= v_year_start
     and sl.date < v_next_start;

  if v_last is null then
    return query
      select 0::bigint, 0::bigint, 0::bigint, 0::numeric, 0::bigint,
             0::bigint, 0::bigint, 0::numeric, null::date, 0::bigint, null::date;
    return;
  end if;

  v_prev_last := v_prev_start + (v_last - v_year_start);

  select
    coalesce(sum(sl.subtotal_cents), 0)::bigint,
    coalesce(sum(case when not sl.is_return then sl.subtotal_cents else 0 end), 0)::bigint,
    coalesce(sum(case when sl.is_return then sl.subtotal_cents else 0 end), 0)::bigint,
    count(distinct sl.document_number)::bigint
  into v_net, v_gross, v_returns, v_docs
    from public.sale_lines sl
    join public.datasets d on d.id = sl.dataset_id
   where d.status = 'ready'
     and sl.date >= v_year_start
     and sl.date <= v_last;

  -- Igual que calculateKpis: un cliente cuenta solo si su saldo neto es distinto de cero.
  select count(*)::bigint
    into v_clients
    from (
      select sl.client_key
        from public.sale_lines sl
        join public.datasets d on d.id = sl.dataset_id
       where d.status = 'ready'
         and sl.date >= v_year_start
         and sl.date <= v_last
       group by sl.client_key
      having sum(sl.subtotal_cents) <> 0
    ) c;

  -- El ticket promedio usa los documentos de venta (excluye NCE).
  select count(distinct sl.document_number)::bigint
    into v_docs_sales
    from public.sale_lines sl
    join public.datasets d on d.id = sl.dataset_id
   where d.status = 'ready'
     and sl.date >= v_year_start
     and sl.date <= v_last
     and not sl.is_return;

  v_ticket := case
    when v_docs_sales = 0 then 0
    else round(v_net::numeric / v_docs_sales::numeric)::bigint
  end;

  select coalesce(
    sum(sl.margin * sl.subtotal_cents)::numeric /
      nullif(sum(sl.subtotal_cents) filter (where sl.subtotal_cents > 0), 0)::numeric,
    0)
    into v_margin
    from public.sale_lines sl
    join public.datasets d on d.id = sl.dataset_id
   where d.status = 'ready'
     and sl.date >= v_year_start
     and sl.date <= v_last
     and sl.subtotal_cents > 0;

  select coalesce(sum(sl.subtotal_cents), 0)::bigint
    into v_prev_net
    from public.sale_lines sl
    join public.datasets d on d.id = sl.dataset_id
   where d.status = 'ready'
     and sl.date >= v_prev_start
     and sl.date <= v_prev_last;

  return query
    select v_net,
           v_gross,
           v_returns,
           case when v_gross = 0 then 0::numeric else abs(v_returns)::numeric / v_gross::numeric end,
           v_docs,
           v_clients,
           coalesce(v_ticket, 0),
           coalesce(v_margin, 0),
           v_last,
           coalesce(v_prev_net, 0),
           v_prev_last;
end;
$$;

create or replace function public.sales_by_month(p_from date, p_to date)
returns table (
  month date,
  net_sales_cents bigint,
  gross_sales_cents bigint,
  returns_cents bigint,
  documents bigint
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  return query
    select date_trunc('month', sl.date)::date as month,
           coalesce(sum(sl.subtotal_cents), 0)::bigint,
           coalesce(sum(case when not sl.is_return then sl.subtotal_cents else 0 end), 0)::bigint,
           coalesce(sum(case when sl.is_return then sl.subtotal_cents else 0 end), 0)::bigint,
           count(distinct sl.document_number)::bigint
      from public.sale_lines sl
      join public.datasets d on d.id = sl.dataset_id
     where d.status = 'ready'
       and sl.date >= p_from
       and sl.date <= p_to
     group by 1
     order by 1;
end;
$$;

create or replace function public.top_products(
  p_from date,
  p_to date,
  p_metric text default 'value',
  p_order text default 'desc',
  p_limit integer default 10,
  p_include_non_products boolean default false
)
returns table (
  key text,
  label text,
  net_sales_cents bigint,
  share numeric,
  documents bigint,
  returns_cents bigint,
  margin numeric,
  cumulative_share numeric,
  quantity numeric,
  unit text
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  return query
    with eligible as (
      select sl.*
        from public.sale_lines sl
        join public.datasets d on d.id = sl.dataset_id
       where d.status = 'ready'
         and sl.date >= p_from
         and sl.date <= p_to
         and (p_include_non_products or sl.is_product)
    ),
    total as (
      select coalesce(sum(subtotal_cents), 0)::numeric as overall from eligible
    ),
    grouped as (
      select sl.item || '|' || sl.unit as key,
             max(sl.item_description) as label,
             sl.item as item,
             sl.unit as unit,
             sum(sl.subtotal_cents)::bigint as net_sales_cents,
             count(distinct sl.document_number)::bigint as documents,
             coalesce(sum(sl.subtotal_cents) filter (where sl.is_return), 0)::bigint as returns_cents,
             sum(sl.quantity)::numeric as quantity,
             sum(sl.margin * sl.subtotal_cents)::numeric as margin_numerator,
             coalesce(sum(sl.subtotal_cents) filter (where sl.subtotal_cents > 0), 0)::numeric as margin_weight
        from eligible sl
       group by sl.item, sl.unit
    ),
    ranked as (
      select g.*,
             case when t.overall = 0 then 0::numeric
                  else g.net_sales_cents::numeric / t.overall end as share,
             case when g.margin_weight = 0 then 0::numeric
                  else g.margin_numerator / g.margin_weight end as margin
        from grouped g cross join total t
    )
    select r.key,
           coalesce(nullif(r.label, ''), r.item) as label,
           r.net_sales_cents,
           r.share,
           r.documents,
           r.returns_cents,
           r.margin,
           sum(r.share) over (
             order by
               case when p_order = 'asc' then
                 case when p_metric = 'quantity' then r.quantity else r.net_sales_cents::numeric end
               end asc nulls last,
               case when p_order = 'desc' then
                 case when p_metric = 'quantity' then r.quantity else r.net_sales_cents::numeric end
               end desc nulls last
             rows between unbounded preceding and current row
           ) as cumulative_share,
           r.quantity,
           r.unit
      from ranked r
     where r.net_sales_cents > 0
     order by
       case when p_order = 'asc' then
         case when p_metric = 'quantity' then r.quantity else r.net_sales_cents::numeric end
       end asc nulls last,
       case when p_order = 'desc' then
         case when p_metric = 'quantity' then r.quantity else r.net_sales_cents::numeric end
       end desc nulls last
     limit greatest(p_limit, 0);
end;
$$;

create or replace function public.top_sellers(p_from date, p_to date, p_limit integer default 10)
returns table (
  key text,
  label text,
  net_sales_cents bigint,
  share numeric,
  documents bigint,
  returns_cents bigint,
  margin numeric,
  cumulative_share numeric
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  return query
    with eligible as (
      select sl.*
        from public.sale_lines sl
        join public.datasets d on d.id = sl.dataset_id
       where d.status = 'ready' and sl.date >= p_from and sl.date <= p_to
    ),
    total as (select coalesce(sum(subtotal_cents), 0)::numeric as overall from eligible),
    grouped as (
      select sl.seller_key as key,
             max(sl.seller_name) as label,
             sum(sl.subtotal_cents)::bigint as net_sales_cents,
             count(distinct sl.document_number)::bigint as documents,
             coalesce(sum(sl.subtotal_cents) filter (where sl.is_return), 0)::bigint as returns_cents,
             sum(sl.margin * sl.subtotal_cents)::numeric as margin_numerator,
             coalesce(sum(sl.subtotal_cents) filter (where sl.subtotal_cents > 0), 0)::numeric as margin_weight
        from eligible sl
       group by sl.seller_key
    ),
    ranked as (
      select g.*,
             case when t.overall = 0 then 0::numeric else g.net_sales_cents::numeric / t.overall end as share,
             case when g.margin_weight = 0 then 0::numeric else g.margin_numerator / g.margin_weight end as margin
        from grouped g cross join total t
    )
    select r.key, r.label, r.net_sales_cents, r.share, r.documents, r.returns_cents, r.margin,
           sum(r.share) over (order by r.net_sales_cents desc rows between unbounded preceding and current row)
      from ranked r
     order by r.net_sales_cents desc
     limit greatest(p_limit, 0);
end;
$$;

create or replace function public.top_clients(p_from date, p_to date, p_limit integer default 10)
returns table (
  key text,
  label text,
  net_sales_cents bigint,
  share numeric,
  documents bigint,
  returns_cents bigint,
  margin numeric,
  cumulative_share numeric
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  return query
    with eligible as (
      select sl.*
        from public.sale_lines sl
        join public.datasets d on d.id = sl.dataset_id
       where d.status = 'ready' and sl.date >= p_from and sl.date <= p_to
    ),
    total as (select coalesce(sum(subtotal_cents), 0)::numeric as overall from eligible),
    grouped as (
      select sl.client_key as key,
             max(sl.client_name) as label,
             sum(sl.subtotal_cents)::bigint as net_sales_cents,
             count(distinct sl.document_number)::bigint as documents,
             coalesce(sum(sl.subtotal_cents) filter (where sl.is_return), 0)::bigint as returns_cents,
             sum(sl.margin * sl.subtotal_cents)::numeric as margin_numerator,
             coalesce(sum(sl.subtotal_cents) filter (where sl.subtotal_cents > 0), 0)::numeric as margin_weight
        from eligible sl
       group by sl.client_key
    ),
    ranked as (
      select g.*,
             case when t.overall = 0 then 0::numeric else g.net_sales_cents::numeric / t.overall end as share,
             case when g.margin_weight = 0 then 0::numeric else g.margin_numerator / g.margin_weight end as margin
        from grouped g cross join total t
    )
    select r.key, r.label, r.net_sales_cents, r.share, r.documents, r.returns_cents, r.margin,
           sum(r.share) over (order by r.net_sales_cents desc rows between unbounded preceding and current row)
      from ranked r
     order by r.net_sales_cents desc
     limit greatest(p_limit, 0);
end;
$$;

create or replace function public.sales_by_family(p_from date, p_to date, p_limit integer default 10)
returns table (
  key text,
  label text,
  net_sales_cents bigint,
  share numeric,
  documents bigint,
  returns_cents bigint,
  margin numeric,
  cumulative_share numeric
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  return query
    with eligible as (
      select sl.*
        from public.sale_lines sl
        join public.datasets d on d.id = sl.dataset_id
       where d.status = 'ready' and sl.date >= p_from and sl.date <= p_to
    ),
    total as (select coalesce(sum(subtotal_cents), 0)::numeric as overall from eligible),
    grouped as (
      select sl.family_key as key,
             max(sl.family_key) as label,
             sum(sl.subtotal_cents)::bigint as net_sales_cents,
             count(distinct sl.document_number)::bigint as documents,
             coalesce(sum(sl.subtotal_cents) filter (where sl.is_return), 0)::bigint as returns_cents,
             sum(sl.margin * sl.subtotal_cents)::numeric as margin_numerator,
             coalesce(sum(sl.subtotal_cents) filter (where sl.subtotal_cents > 0), 0)::numeric as margin_weight
        from eligible sl
       group by sl.family_key
    ),
    ranked as (
      select g.*,
             case when t.overall = 0 then 0::numeric else g.net_sales_cents::numeric / t.overall end as share,
             case when g.margin_weight = 0 then 0::numeric else g.margin_numerator / g.margin_weight end as margin
        from grouped g cross join total t
    )
    select r.key, r.label, r.net_sales_cents, r.share, r.documents, r.returns_cents, r.margin,
           sum(r.share) over (order by r.net_sales_cents desc rows between unbounded preceding and current row)
      from ranked r
     order by r.net_sales_cents desc
     limit greatest(p_limit, 0);
end;
$$;

create or replace function public.sales_by_warehouse(p_from date, p_to date, p_limit integer default 10)
returns table (
  key text,
  label text,
  net_sales_cents bigint,
  share numeric,
  documents bigint,
  returns_cents bigint,
  margin numeric,
  cumulative_share numeric
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  return query
    with eligible as (
      select sl.*
        from public.sale_lines sl
        join public.datasets d on d.id = sl.dataset_id
       where d.status = 'ready' and sl.date >= p_from and sl.date <= p_to
    ),
    total as (select coalesce(sum(subtotal_cents), 0)::numeric as overall from eligible),
    grouped as (
      select sl.warehouse as key,
             max(sl.warehouse) as label,
             sum(sl.subtotal_cents)::bigint as net_sales_cents,
             count(distinct sl.document_number)::bigint as documents,
             coalesce(sum(sl.subtotal_cents) filter (where sl.is_return), 0)::bigint as returns_cents,
             sum(sl.margin * sl.subtotal_cents)::numeric as margin_numerator,
             coalesce(sum(sl.subtotal_cents) filter (where sl.subtotal_cents > 0), 0)::numeric as margin_weight
        from eligible sl
       group by sl.warehouse
    ),
    ranked as (
      select g.*,
             case when t.overall = 0 then 0::numeric else g.net_sales_cents::numeric / t.overall end as share,
             case when g.margin_weight = 0 then 0::numeric else g.margin_numerator / g.margin_weight end as margin
        from grouped g cross join total t
    )
    select r.key, r.label, r.net_sales_cents, r.share, r.documents, r.returns_cents, r.margin,
           sum(r.share) over (order by r.net_sales_cents desc rows between unbounded preceding and current row)
      from ranked r
     order by r.net_sales_cents desc
     limit greatest(p_limit, 0);
end;
$$;

create or replace function public.data_coverage()
returns table (
  first_date date,
  last_date date,
  months_with_data integer,
  missing_months date[],
  last_upload_at timestamptz,
  datasets_ready integer
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_first date;
  v_last date;
begin
  select min(sl.date), max(sl.date) into v_first, v_last
    from public.sale_lines sl
    join public.datasets d on d.id = sl.dataset_id
   where d.status = 'ready';

  if v_first is null then
    return query
      select null::date, null::date, 0, array[]::date[], null::timestamptz, 0;
    return;
  end if;

  return query
    with months_with_data as (
      select distinct date_trunc('month', sl.date)::date as month
        from public.sale_lines sl
        join public.datasets d on d.id = sl.dataset_id
       where d.status = 'ready'
    ),
    months as (
      select gs::date as month
        from generate_series(
          date_trunc('month', v_first)::date,
          date_trunc('month', v_last)::date,
          interval '1 month'
        ) as gs
    )
    select v_first,
           v_last,
           (select count(*) from months_with_data)::integer,
           coalesce((
             select array_agg(m.month order by m.month)
               from months m
              where not exists (
                select 1 from months_with_data wd where wd.month = m.month
              )
           ), array[]::date[]),
           (select max(d.uploaded_at)
              from public.datasets d
              join public.sale_lines sl on sl.dataset_id = d.id
             where d.status = 'ready'),
           (select count(distinct d.id)::integer
              from public.datasets d
              join public.sale_lines sl on sl.dataset_id = d.id
             where d.status = 'ready');
end;
$$;

-- ---------------------------------------------------------------------------
-- activate_dataset: transaccional. Reemplaza datasets y deja análisis previos
-- como superseded (constancia) con dataset_id = null por el FK on delete set null.
-- ---------------------------------------------------------------------------
create or replace function public.activate_dataset(p_new_id uuid, p_replace_ids uuid[])
returns void
language plpgsql
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_analysis_id uuid;
  v_replace uuid;
begin
  if not exists (
    select 1 from public.datasets where id = p_new_id and status = 'processing'
  ) then
    raise exception 'El dataset % no existe o no está en estado processing', p_new_id
      using errcode = 'invalid_parameter_value';
  end if;

  select id into v_analysis_id
    from public.analyses
   where dataset_id = p_new_id and status = 'active'
   limit 1;

  if coalesce(array_length(p_replace_ids, 1), 0) > 0 then
    foreach v_replace in array p_replace_ids loop
      delete from public.sale_lines where dataset_id = v_replace;

      update public.analyses
         set status = 'superseded',
             superseded_by = coalesce(v_analysis_id, superseded_by)
       where dataset_id = v_replace
         and status = 'active';

      delete from public.datasets where id = v_replace;
    end loop;
  end if;

  update public.datasets set status = 'ready' where id = p_new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: service role en API Routes; sin acceso para anon/authenticated.
-- ---------------------------------------------------------------------------
revoke all on function public.panel_summary(integer) from public, anon, authenticated;
revoke all on function public.sales_by_month(date, date) from public, anon, authenticated;
revoke all on function public.top_products(date, date, text, text, integer, boolean) from public, anon, authenticated;
revoke all on function public.top_sellers(date, date, integer) from public, anon, authenticated;
revoke all on function public.top_clients(date, date, integer) from public, anon, authenticated;
revoke all on function public.sales_by_family(date, date, integer) from public, anon, authenticated;
revoke all on function public.sales_by_warehouse(date, date, integer) from public, anon, authenticated;
revoke all on function public.data_coverage() from public, anon, authenticated;
revoke all on function public.activate_dataset(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.prevent_commission_report_changes() from public, anon, authenticated;

grant execute on function public.panel_summary(integer) to service_role;
grant execute on function public.sales_by_month(date, date) to service_role;
grant execute on function public.top_products(date, date, text, text, integer, boolean) to service_role;
grant execute on function public.top_sellers(date, date, integer) to service_role;
grant execute on function public.top_clients(date, date, integer) to service_role;
grant execute on function public.sales_by_family(date, date, integer) to service_role;
grant execute on function public.sales_by_warehouse(date, date, integer) to service_role;
grant execute on function public.data_coverage() to service_role;
grant execute on function public.activate_dataset(uuid, uuid[]) to service_role;
