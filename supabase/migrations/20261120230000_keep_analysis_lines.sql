-- Los informes reemplazados conservan su dataset y sus líneas.
-- El panel sigue agregando solo datasets en estado ready; archived queda fuera.

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
      from pg_constraint
     where conrelid = 'public.datasets'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.datasets drop constraint %I', v_constraint.conname);
  end loop;
end $$;

alter table public.datasets
  add constraint datasets_status_check
  check (status in ('processing', 'ready', 'failed', 'archived'));

comment on column public.datasets.status is
  'Solo ready cuenta en agregados y solapes; archived conserva líneas de informes reemplazados.';

-- ---------------------------------------------------------------------------
-- activate_dataset: archiva el dataset reemplazado en vez de borrarlo.
-- El análisis superseded mantiene dataset_id, así Comisiones puede recalcular
-- sobre sus propias líneas y una futura reactivación no pierde el detalle.
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
      update public.analyses
         set status = 'superseded',
             superseded_by = coalesce(v_analysis_id, superseded_by)
       where dataset_id = v_replace
         and status = 'active';

      update public.datasets set status = 'archived' where id = v_replace;
    end loop;
  end if;

  update public.datasets set status = 'ready' where id = p_new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_analysis: reactiva la versión previa recuperando también su dataset.
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
  v_previous_dataset_id uuid;
  v_previous_start date;
  v_previous_end date;
begin
  select dataset_id, period_month, status
    into v_dataset_id, v_period_month, v_status
    from public.analyses
   where id = p_id;

  if not found then
    raise exception 'No se encontró el informe guardado'
      using errcode = 'no_data_found';
  end if;

  if v_status = 'active' then
    select id
      into v_previous_id
      from public.analyses
     where period_month = v_period_month
       and status = 'superseded'
       and superseded_by = p_id
     order by created_at desc
     limit 1;

    if v_previous_id is not null then
      select dataset_id, period_start, period_end
        into v_previous_dataset_id, v_previous_start, v_previous_end
        from public.analyses
       where id = v_previous_id;

      -- Datos legacy: el dataset se borró y analysis.dataset_id quedó nulo.
      if v_previous_dataset_id is null then
        select d.id
          into v_previous_dataset_id
          from public.datasets d
         where d.period_start = v_previous_start
           and d.period_end = v_previous_end
           and d.status in ('ready', 'archived')
         order by (d.status = 'archived') desc, d.uploaded_at desc
         limit 1;
      end if;
    end if;
  end if;

  perform set_config('app.allow_report_delete', 'on', true);
  delete from public.commission_reports where analysis_id = p_id;
  delete from public.analyses where id = p_id;

  if v_previous_id is not null then
    update public.analyses
       set status = 'active',
           superseded_by = null,
           dataset_id = v_previous_dataset_id
     where id = v_previous_id;

    if v_previous_dataset_id is not null then
      update public.datasets set status = 'ready' where id = v_previous_dataset_id;
    end if;
  end if;

  if v_dataset_id is not null
     and v_dataset_id is distinct from v_previous_dataset_id
     and not exists (
       select 1 from public.analyses where dataset_id = v_dataset_id
     ) then
    delete from public.datasets where id = v_dataset_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reparación de datos existentes: análisis sin dataset con un dataset libre
-- que cubre exactamente el mismo periodo.
-- ---------------------------------------------------------------------------
update public.analyses a
   set dataset_id = d.id
  from public.datasets d
 where a.dataset_id is null
   and d.status in ('ready', 'archived')
   and d.period_start = a.period_start
   and d.period_end = a.period_end
   and not exists (
     select 1 from public.analyses other where other.dataset_id = d.id
   );

update public.datasets d
   set status = 'ready'
  from public.analyses a
 where a.dataset_id = d.id
   and a.status = 'active'
   and d.status = 'archived';

notify pgrst, 'reload schema';
