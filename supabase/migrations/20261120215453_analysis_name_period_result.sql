-- Nombre y periodo editables, resultado calculado persistido y borrado de informes.
-- Las cifras siguen calculándose en el servidor; el cliente nunca envía montos.

alter table public.analyses
  add column if not exists name text not null default '',
  add column if not exists result jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

-- Informes anteriores a esta migración conservan su archivo como nombre.
update public.analyses
   set name = file_name
 where name = '';

comment on column public.analyses.name is
  'Alias editable del informe; no altera el archivo ni las cifras guardadas.';
comment on column public.analyses.result is
  'Overview completo calculado en el servidor al guardar; se muestra sin recalcular.';
comment on column public.analyses.updated_at is
  'Última edición de nombre o periodo.';

-- ---------------------------------------------------------------------------
-- updated_at se mantiene solo en el servidor.
-- ---------------------------------------------------------------------------
create or replace function public.touch_analysis_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists analyses_touch_updated_at on public.analyses;
create trigger analyses_touch_updated_at
  before update on public.analyses
  for each row execute function public.touch_analysis_updated_at();

-- ---------------------------------------------------------------------------
-- commission_reports sigue siendo append-only, salvo desde delete_analysis.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_commission_report_changes()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_setting('app.allow_report_delete', true) = 'on' then
    return old;
  end if;

  raise exception 'commission_reports es append-only: UPDATE y DELETE no permitidos'
    using errcode = 'integrity_constraint_violation';
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_analysis: borra el informe, su dataset y reactiva la versión previa.
-- ---------------------------------------------------------------------------
create or replace function public.delete_analysis(p_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_dataset_id uuid;
  v_period_month date;
  v_status text;
  v_previous_id uuid;
begin
  select dataset_id, period_month, status
    into v_dataset_id, v_period_month, v_status
    from public.analyses
   where id = p_id;

  if not found then
    raise exception 'No se encontró el informe guardado'
      using errcode = 'no_data_found';
  end if;

  -- Se captura antes de borrar: el FK deja superseded_by en null automáticamente.
  if v_status = 'active' then
    select id
      into v_previous_id
      from public.analyses
     where period_month = v_period_month
       and status = 'superseded'
       and superseded_by = p_id
     order by created_at desc
     limit 1;
  end if;

  perform set_config('app.allow_report_delete', 'on', true);
  delete from public.commission_reports where analysis_id = p_id;

  delete from public.analyses where id = p_id;

  if v_previous_id is not null then
    update public.analyses
       set status = 'active',
           superseded_by = null
     where id = v_previous_id;
  end if;

  if v_dataset_id is not null
     and not exists (
       select 1 from public.analyses where dataset_id = v_dataset_id
     ) then
    delete from public.datasets where id = v_dataset_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: solo service_role desde las API Routes.
-- ---------------------------------------------------------------------------
revoke all on function public.touch_analysis_updated_at() from public, anon, authenticated;
revoke all on function public.delete_analysis(uuid) from public, anon, authenticated;

grant execute on function public.touch_analysis_updated_at() to service_role;
grant execute on function public.delete_analysis(uuid) to service_role;

notify pgrst, 'reload schema';
