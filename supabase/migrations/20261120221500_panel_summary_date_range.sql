-- El resumen del panel debe responder a un rango arbitrario de fechas.
-- Se reemplaza la firma por año por una firma con fechas explícitas.
drop function if exists public.panel_summary(integer);

create or replace function public.panel_summary(p_from date, p_to date)
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
     and sl.date <= p_to;

  if v_last is null then
    return query
      select 0::bigint, 0::bigint, 0::bigint, 0::numeric, 0::bigint,
             0::bigint, 0::bigint, 0::numeric, null::date, 0::bigint, null::date;
    return;
  end if;

  -- Periodo inmediatamente anterior, de la misma longitud que el solicitado.
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
     and sl.date <= p_to;

  -- Igual que calculateKpis: un cliente cuenta solo si su saldo neto es distinto de cero.
  select count(*)::bigint
    into v_clients
    from (
      select sl.client_key
        from public.sale_lines sl
        join public.datasets d on d.id = sl.dataset_id
       where d.status = 'ready'
         and sl.date >= p_from
         and sl.date <= p_to
       group by sl.client_key
      having sum(sl.subtotal_cents) <> 0
    ) c;

  -- El ticket promedio usa los documentos de venta (excluye NCE).
  select count(distinct sl.document_number)::bigint
    into v_docs_sales
    from public.sale_lines sl
    join public.datasets d on d.id = sl.dataset_id
   where d.status = 'ready'
     and sl.date >= p_from
     and sl.date <= p_to
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
     and sl.date >= p_from
     and sl.date <= p_to
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

revoke all on function public.panel_summary(date, date) from public, anon, authenticated;
grant execute on function public.panel_summary(date, date) to service_role;
