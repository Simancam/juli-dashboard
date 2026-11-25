-- Comisiones guardadas editables y borrables desde la API.
-- El cálculo sigue haciéndose en el servidor: el cliente solo envía entradas.

alter table public.commission_reports
  add column if not exists updated_at timestamptz not null default now();

comment on table public.commission_reports is
  'Comisiones calculadas en el servidor; conservan id, versión y análisis al editarse.';
comment on column public.commission_reports.updated_at is
  'Última edición de tasas, anticipo, vendedores o reasignaciones.';

-- ---------------------------------------------------------------------------
-- updated_at se mantiene solo en el servidor.
-- ---------------------------------------------------------------------------
create or replace function public.touch_commission_report_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists commission_reports_touch_updated_at on public.commission_reports;
create trigger commission_reports_touch_updated_at
  before update on public.commission_reports
  for each row execute function public.touch_commission_report_updated_at();

-- Se retira el modo append-only: ahora se permite editar y borrar una comisión.
-- La función prevent_commission_report_changes queda por compatibilidad con
-- migraciones anteriores, pero ningún trigger la ejecuta.
drop trigger if exists commission_reports_no_update on public.commission_reports;
drop trigger if exists commission_reports_no_delete on public.commission_reports;

-- ---------------------------------------------------------------------------
-- Permisos: solo service_role desde las API Routes.
-- ---------------------------------------------------------------------------
revoke all on function public.touch_commission_report_updated_at() from public, anon, authenticated;
grant execute on function public.touch_commission_report_updated_at() to service_role;

notify pgrst, 'reload schema';
