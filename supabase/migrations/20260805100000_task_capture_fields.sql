-- AgenturOS Punkt 32D.1: create_task um Assignee, Priorität und Fälligkeit erweitern

drop function if exists public.create_task(text, text, uuid);

create or replace function public.create_task(
  p_title text,
  p_description text default null,
  p_case_id uuid default null,
  p_assignee_user_id uuid default null,
  p_priority text default 'normal',
  p_due_date date default null
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
  v_priority text;
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

  if p_assignee_user_id is not null
     and not public.user_is_active_member_of_agency(p_assignee_user_id, v_agency_id) then
    raise exception 'assignee not active agency member'
      using errcode = 'P0001';
  end if;

  v_priority := coalesce(nullif(btrim(p_priority), ''), 'normal');
  if v_priority not in ('low', 'normal', 'high') then
    raise exception 'invalid priority'
      using errcode = 'P0001';
  end if;

  v_description := nullif(trim(p_description), '');

  insert into public.tasks (
    user_id,
    created_by,
    agency_id,
    assignee_user_id,
    title,
    description,
    priority,
    due_date,
    case_id
  )
  values (
    v_user_id,
    v_user_id,
    v_agency_id,
    p_assignee_user_id,
    trim(p_title),
    v_description,
    v_priority,
    p_due_date,
    p_case_id
  )
  returning * into v_task;

  perform public.insert_task_created_timeline_entry(v_task.id, v_user_id);

  if v_task.case_id is not null then
    perform public.insert_case_system_timeline_entry(
      v_task.case_id,
      v_task.agency_id,
      v_user_id,
      'task_created',
      'Aufgabe erstellt: „' || trim(v_task.title) || '“',
      null,
      jsonb_build_object(
        'task_id', v_task.id,
        'task_title', trim(v_task.title)
      ),
      v_task.created_at
    );
  end if;

  return v_task;
end;
$$;

comment on function public.create_task(text, text, uuid, uuid, text, date) is
  'Erstellt atomar eine Aufgabe mit optionaler Vorgangsverknüpfung, Verantwortlichem, Priorität und Fälligkeit.';

revoke all on function public.create_task(text, text, uuid, uuid, text, date) from public;
revoke all on function public.create_task(text, text, uuid, uuid, text, date) from anon;
revoke all on function public.create_task(text, text, uuid, uuid, text, date) from service_role;
grant execute on function public.create_task(text, text, uuid, uuid, text, date) to authenticated;
