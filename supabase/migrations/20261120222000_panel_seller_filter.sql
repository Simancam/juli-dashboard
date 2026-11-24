-- Filtro opcional por vendedor en todos los agregados del panel.
-- p_seller_key null significa "todos los vendedores".
-- Se conserva la regla d.status = 'ready' y los montos en centavos.

drop function if exists public.panel_summary(date, date);
drop function if exists public.sales_by_month(date, date);
drop function if exists public.top_products(date, date, text, text, integer, boolean);
drop function if exists public.top_sellers(date, date, integer);
drop function if exists public.top_clients(date, date, integer);
drop function if exists public.sales_by_family(date, date, integer);
drop function if exists public.sales_by_warehouse(date, date, integer);

create or replace function public.panel_summary(
  p_from date,
  p_to date,
  p_seller_key text default null
)
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
  v_last date;
  v_prev_start date;
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
     and sl.date >= p_from
     and sl.date <= p_to
     and (p_seller_key is null or sl.seller_key = p_seller_key);

  if v_last is null then
    return query
      select 0::bigint, 0::bigint, 0::bigint, 0::numeric, 0::bigint,
             0::bigint, 0::bigint, 0::numeric, null::date, 0::bigint, null::date;
    return;
  end if;

  v_prev_last := p_from - 1;
  v_prev_start := p_from - (p_to - p_from) - 1;

  select
    coalesce(sum(sl.subtotal_cents), 0)::bigint,
    coalesce(sum(case when not sl.is_return then sl.subtotal_cents else 0 end), 0)::bigint,
    coalesce(sum(case when sl.is_return then sl.subtotal_cents else 0 end), 0)::bigint,
    count(distinct sl.document_number)::bigint
  into v_net, v_gross, v_returns, v_docs
    from public.sale_lines sl
    join public.datasets d on d.id = sl.dataset_id
   where d.status = 'ready'
     and sl.date >= p_from
     and sl.date <= p_to
     and (p_seller_key is null or sl.seller_key = p_seller_key);

  select count(*)::bigint
    into v_clients
    from (
      select sl.client_key
        from public.sale_lines sl
        join public.datasets d on d.id = sl.dataset_id
       where d.status = 'ready'
         and sl.date >= p_from
         and sl.date <= p_to
         and (p_seller_key is null or sl.seller_key = p_seller_key)
       group by sl.client_key
      having sum(sl.subtotal_cents) <> 0
    ) c;

  select count(distinct sl.document_number)::bigint
    into v_docs_sales
    from public.sale_lines sl
    join public.datasets d on d.id = sl.dataset_id
   where d.status = 'ready'
     and sl.date >= p_from
     and sl.date <= p_to
     and not sl.is_return
     and (p_seller_key is null or sl.seller_key = p_seller_key);

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
     and sl.date >= p_from
     and sl.date <= p_to
     and sl.subtotal_cents > 0
     and (p_seller_key is null or sl.seller_key = p_seller_key);

  select coalesce(sum(sl.subtotal_cents), 0)::bigint
    into v_prev_net
    from public.sale_lines sl
    join public.datasets d on d.id = sl.dataset_id
   where d.status = 'ready'
     and sl.date >= v_prev_start
     and sl.date <= v_prev_last
     and (p_seller_key is null or sl.seller_key = p_seller_key);

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

create or replace function public.sales_by_month(
  p_from date,
  p_to date,
  p_seller_key text default null
)
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
       and (p_seller_key is null or sl.seller_key = p_seller_key)
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
  p_include_non_products boolean default false,
  p_seller_key text default null
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
         and (p_seller_key is null or sl.seller_key = p_seller_key)
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

create or replace function public.top_sellers(
  p_from date,
  p_to date,
  p_limit integer default 10,
  p_seller_key text default null
)
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
       where d.status = 'ready'
         and sl.date >= p_from
         and sl.date <= p_to
         and (p_seller_key is null or sl.seller_key = p_seller_key)
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

create or replace function public.top_clients(
  p_from date,
  p_to date,
  p_limit integer default 10,
  p_seller_key text default null
)
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
       where d.status = 'ready'
         and sl.date >= p_from
         and sl.date <= p_to
         and (p_seller_key is null or sl.seller_key = p_seller_key)
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

create or replace function public.sales_by_family(
  p_from date,
  p_to date,
  p_limit integer default 10,
  p_seller_key text default null
)
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
       where d.status = 'ready'
         and sl.date >= p_from
         and sl.date <= p_to
         and (p_seller_key is null or sl.seller_key = p_seller_key)
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

create or replace function public.sales_by_warehouse(
  p_from date,
  p_to date,
  p_limit integer default 10,
  p_seller_key text default null
)
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
       where d.status = 'ready'
         and sl.date >= p_from
         and sl.date <= p_to
         and (p_seller_key is null or sl.seller_key = p_seller_key)
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

revoke all on function public.panel_summary(date, date, text) from public, anon, authenticated;
revoke all on function public.sales_by_month(date, date, text) from public, anon, authenticated;
revoke all on function public.top_products(date, date, text, text, integer, boolean, text) from public, anon, authenticated;
revoke all on function public.top_sellers(date, date, integer, text) from public, anon, authenticated;
revoke all on function public.top_clients(date, date, integer, text) from public, anon, authenticated;
revoke all on function public.sales_by_family(date, date, integer, text) from public, anon, authenticated;
revoke all on function public.sales_by_warehouse(date, date, integer, text) from public, anon, authenticated;

grant execute on function public.panel_summary(date, date, text) to service_role;
grant execute on function public.sales_by_month(date, date, text) to service_role;
grant execute on function public.top_products(date, date, text, text, integer, boolean, text) to service_role;
grant execute on function public.top_sellers(date, date, integer, text) to service_role;
grant execute on function public.top_clients(date, date, integer, text) to service_role;
grant execute on function public.sales_by_family(date, date, integer, text) to service_role;
grant execute on function public.sales_by_warehouse(date, date, integer, text) to service_role;
