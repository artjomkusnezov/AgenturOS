-- AgenturOS Punkt 31E.2: Aufgaben innerhalb eines Vorgangs
-- 1:N Zugehörigkeit: tasks.case_id → cases.id (nullable, eigenständig nutzbar)

alter table public.tasks
  add column case_id uuid references public.cases (id) on delete set null;

comment on column public.tasks.case_id is
  'Optionaler übergeordneter Vorgang; null = eigenständige Aufgabe.';

create index tasks_case_id_created_at_idx
  on public.tasks (case_id, created_at)
  where case_id is not null;

-- create_task um optionale case_id erweitern (alte Signatur ersetzen)
drop function if exists public.create_task(text, text);

create or replace function public.create_task(
  p_title text,
  p_description text default null,
  p_case_id uuid default null
)
returns public.tasks
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_agency_id uuid;
  v_active_membership_count integer;
  v_task public.tasks%rowtype;
  v_description text;
  v_case public.cases%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  if p_title is null or trim(p_title) = '' then
    raise exception 'task title empty'
      using errcode = 'P0001';
  end if;

  select count(*)::integer
  into v_active_membership_count
  from public.agency_memberships as m
  where m.user_id = v_user_id
    and m.status = 'active'::public.membership_status;

  if v_active_membership_count = 0 then
    raise exception 'no active agency membership'
      using errcode = 'P0001';
  end if;

  if v_active_membership_count > 1 then
    raise exception 'ambiguous active agency membership'
      using errcode = 'P0001';
  end if;

  select m.agency_id
  into v_agency_id
  from public.agency_memberships as m
  where m.user_id = v_user_id
    and m.status = 'active'::public.membership_status;

  if p_case_id is not null then
    select c.*
    into v_case
    from public.cases as c
    where c.id = p_case_id;

    if not found then
      raise exception 'case not found'
        using errcode = 'P0001';
    end if;

    if v_case.agency_id <> v_agency_id then
      raise exception 'case agency mismatch'
        using errcode = 'P0001';
    end if;

    if not public.user_has_active_agency_membership(v_case.agency_id) then
      raise exception 'access denied'
        using errcode = '42501';
    end if;
  end if;

  v_description := nullif(trim(p_description), '');

  insert into public.tasks (
    user_id,
    created_by,
    agency_id,
    assignee_user_id,
    title,
    description,
    case_id
  )
  values (
    v_user_id,
    v_user_id,
    v_agency_id,
    null,
    trim(p_title),
    v_description,
    p_case_id
  )
  returning * into v_task;

  perform public.insert_task_created_timeline_entry(v_task.id, v_user_id);

  return v_task;
end;
$$;

comment on function public.create_task(text, text, uuid) is
  'Erstellt atomar eine Aufgabe (optional verknüpft mit case_id) und den Chronikeintrag task.created.';

revoke all on function public.create_task(text, text, uuid) from public;
revoke all on function public.create_task(text, text, uuid) from anon;
revoke all on function public.create_task(text, text, uuid) from service_role;
grant execute on function public.create_task(text, text, uuid) to authenticated;
