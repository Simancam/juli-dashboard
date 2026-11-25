-- Puntos configurables para la gráfica del panel: por mes o por día,
-- con métricas adicionales de entidades para el eje Y.

create or replace function public.panel_chart_points(
  p_from date,
  p_to date,
  p_granularity text default 'month',
  p_seller_keys text[] default null
)
returns table (
  bucket date,
  net_sales_cents bigint,
  gross_sales_cents bigint,
  returns_cents bigint,
  documents bigint,
  clients bigint,
  products bigint,
  families bigint,
  sellers bigint,
  warehouses bigint,
  quantity bigint
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  return query
    select
      case
        when p_granularity = 'day' then sl.date
        else date_trunc('month', sl.date)::date
      end as bucket,
      coalesce(sum(sl.subtotal_cents), 0)::bigint,
      coalesce(sum(case when not sl.is_return then sl.subtotal_cents else 0 end), 0)::bigint,
      coalesce(sum(case when sl.is_return then sl.subtotal_cents else 0 end), 0)::bigint,
      count(distinct sl.document_number)::bigint,
      count(distinct sl.client_key)::bigint,
      count(distinct sl.item)::bigint,
      count(distinct sl.family_key)::bigint,
      count(distinct sl.seller_key)::bigint,
      count(distinct sl.warehouse)::bigint,
      coalesce(sum(sl.quantity), 0)::bigint
    from public.sale_lines sl
    join public.datasets d on d.id = sl.dataset_id
   where d.status = 'ready'
     and sl.date >= p_from
     and sl.date <= p_to
     and (p_seller_keys is null or sl.seller_key = any(p_seller_keys))
   group by 1
   order by 1;
end;
$$;

revoke all on function public.panel_chart_points(date, date, text, text[]) from public, anon, authenticated;
grant execute on function public.panel_chart_points(date, date, text, text[]) to service_role;
