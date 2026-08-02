-- AgenturOS Punkt 31E.4: Editierbarer Case-Workflow (Status, Assignee, Priorität, Fälligkeit)
-- Additive: gemeinsame update_case RPC + Timeline-Event-Typen.

-- ---------------------------------------------------------------------------
-- 1. Timeline: neue System-Event-Typen
-- ---------------------------------------------------------------------------

alter table public.case_timeline_entries
  drop constraint if exists case_timeline_entries_event_type_valid;

alter table public.case_timeline_entries
  add constraint case_timeline_entries_event_type_valid check (
    event_type in (
      'created',
      'note',
      'attachment',
      'task_created',
      'task_completed',
      'status_changed',
      'assignee_changed',
      'priority_changed',
      'due_at_changed'
    )
  );

create or replace function public.insert_case_system_timeline_entry(
  p_case_id uuid,
  p_agency_id uuid,
  p_created_by uuid,
  p_event_type text,
  p_content text,
  p_file_id uuid default null,
  p_metadata jsonb default null,
  p_created_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
begin
  if p_event_type is null
     or p_event_type not in (
       'created',
       'attachment',
       'task_created',
       'task_completed',
       'status_changed',
       'assignee_changed',
       'priority_changed',
       'due_at_changed'
     )
  then
    raise exception 'invalid case timeline system event type'
      using errcode = 'P0001';
  end if;

  if p_content is null or trim(p_content) = '' then
    raise exception 'case timeline content empty'
      using errcode = 'P0001';
  end if;

  insert into public.case_timeline_entries (
    case_id,
    agency_id,
    created_by,
    event_type,
    content,
    file_id,
    metadata,
    created_at
  )
  values (
    p_case_id,
    p_agency_id,
    p_created_by,
    p_event_type,
    trim(p_content),
    p_file_id,
    p_metadata,
    coalesce(p_created_at, now())
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Label-Helfer für Timeline-Texte
-- ---------------------------------------------------------------------------

create or replace function public.format_case_core_status_label(p_status text)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case p_status
    when 'open' then 'Offen'
    when 'in_progress' then 'In Bearbeitung'
    when 'waiting' then 'Wartet'
    when 'completed' then 'Abgeschlossen'
    when 'cancelled' then 'Abgebrochen'
    else coalesce(p_status, '')
  end;
$$;

create or replace function public.format_case_priority_label(p_priority text)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case p_priority
    when 'low' then 'Niedrig'
    when 'normal' then 'Normal'
    when 'high' then 'Hoch'
    else coalesce(p_priority, '')
  end;
$$;

revoke all on function public.format_case_core_status_label(text) from public;
revoke all on function public.format_case_core_status_label(text) from anon;
revoke all on function public.format_case_core_status_label(text) from authenticated;
revoke all on function public.format_case_core_status_label(text) from service_role;

revoke all on function public.format_case_priority_label(text) from public;
revoke all on function public.format_case_priority_label(text) from anon;
revoke all on function public.format_case_priority_label(text) from authenticated;
revoke all on function public.format_case_priority_label(text) from service_role;

-- ---------------------------------------------------------------------------
-- 3. update_case – gemeinsamer Writer für Nicht-Task-Cases
-- ---------------------------------------------------------------------------
-- completed_at-Regel:
--   - Wechsel zu completed oder cancelled → completed_at = now() (falls noch null: setzen; sonst beibehalten)
--   - Wechsel zu open / in_progress / waiting → completed_at = null
-- Task-Cases (source_task_id gesetzt oder Typ task) werden abgelehnt.

create or replace function public.update_case(
  p_case_id uuid,
  p_set_core_status boolean default false,
  p_core_status text default null,
  p_set_assignee boolean default false,
  p_assignee_user_id uuid default null,
  p_set_priority boolean default false,
  p_priority text default null,
  p_set_due_at boolean default false,
  p_due_at date default null
)
returns public.cases
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_case public.cases%rowtype;
  v_type_key text;
  v_actor_name text;
  v_old_status text;
  v_new_status text;
  v_old_assignee uuid;
  v_new_assignee uuid;
  v_old_priority text;
  v_new_priority text;
  v_old_due date;
  v_new_due date;
  v_assignee_name text;
  v_content text;
  v_metadata jsonb;
  v_changed boolean := false;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  if not (
    p_set_core_status
    or p_set_assignee
    or p_set_priority
    or p_set_due_at
  ) then
    raise exception 'no case fields to update'
      using errcode = 'P0001';
  end if;

  select *
  into v_case
  from public.cases
  where id = p_case_id
  for update;

  if not found then
    raise exception 'case not found'
      using errcode = 'P0001';
  end if;

  if not public.user_has_active_agency_membership(v_case.agency_id) then
    raise exception 'access denied'
      using errcode = '42501';
  end if;

  select ct.key
  into v_type_key
  from public.case_types as ct
  where ct.id = v_case.case_type_id;

  if v_case.source_task_id is not null or v_type_key = 'task' then
    raise exception 'task cases must be updated via task writers'
      using errcode = 'P0001';
  end if;

  v_old_status := v_case.core_status;
  v_new_status := v_case.core_status;
  v_old_assignee := v_case.assignee_user_id;
  v_new_assignee := v_case.assignee_user_id;
  v_old_priority := v_case.priority;
  v_new_priority := v_case.priority;
  v_old_due := v_case.due_at;
  v_new_due := v_case.due_at;

  if p_set_core_status then
    if p_core_status is null
       or p_core_status not in ('open', 'in_progress', 'waiting', 'completed', 'cancelled')
    then
      raise exception 'invalid core status'
        using errcode = 'P0001';
    end if;
    v_new_status := p_core_status;
  end if;

  if p_set_assignee then
    if p_assignee_user_id is not null
       and not public.user_is_active_member_of_agency(p_assignee_user_id, v_case.agency_id)
    then
      raise exception 'assignee not an active agency member'
        using errcode = 'P0001';
    end if;
    v_new_assignee := p_assignee_user_id;
  end if;

  if p_set_priority then
    if p_priority is null or p_priority not in ('low', 'normal', 'high') then
      raise exception 'invalid priority'
        using errcode = 'P0001';
    end if;
    v_new_priority := p_priority;
  end if;

  if p_set_due_at then
    v_new_due := p_due_at;
  end if;

  if v_type_key = 'follow_up' and v_new_due is null then
    raise exception 'due_at required for follow_up'
      using errcode = 'P0001';
  end if;

  if v_old_status is not distinct from v_new_status
     and v_old_assignee is not distinct from v_new_assignee
     and v_old_priority is not distinct from v_new_priority
     and v_old_due is not distinct from v_new_due
  then
    return v_case;
  end if;

  update public.cases
  set
    core_status = v_new_status,
    assignee_user_id = v_new_assignee,
    priority = v_new_priority,
    due_at = v_new_due,
    completed_at = case
      when v_new_status in ('completed', 'cancelled') then coalesce(v_case.completed_at, now())
      else null
    end,
    updated_at = now()
  where id = p_case_id
  returning * into v_case;

  v_actor_name := public.resolve_timeline_actor_name(v_user_id);

  if v_old_status is distinct from v_new_status then
    v_metadata := jsonb_build_object(
      'previous_core_status', v_old_status,
      'new_core_status', v_new_status
    );
    v_content := v_actor_name
      || ' änderte den Status auf '
      || public.format_case_core_status_label(v_new_status)
      || '.';

    perform public.insert_case_system_timeline_entry(
      v_case.id,
      v_case.agency_id,
      v_user_id,
      'status_changed',
      v_content,
      null,
      v_metadata,
      now()
    );
    v_changed := true;
  end if;

  if v_old_assignee is distinct from v_new_assignee then
    v_metadata := jsonb_build_object(
      'previous_assignee_user_id', v_old_assignee,
      'new_assignee_user_id', v_new_assignee
    );

    if v_new_assignee is null then
      v_content := v_actor_name || ' hat die Verantwortlichkeit entfernt.';
    elsif v_new_assignee = v_user_id then
      v_content := v_actor_name || ' hat die Verantwortung übernommen.';
    else
      v_assignee_name := public.resolve_timeline_actor_name(v_new_assignee);
      v_content := v_assignee_name || ' wurde als verantwortlich eingetragen.';
    end if;

    perform public.insert_case_system_timeline_entry(
      v_case.id,
      v_case.agency_id,
      v_user_id,
      'assignee_changed',
      v_content,
      null,
      v_metadata,
      now()
    );
    v_changed := true;
  end if;

  if v_old_priority is distinct from v_new_priority then
    v_metadata := jsonb_build_object(
      'previous_priority', v_old_priority,
      'new_priority', v_new_priority
    );
    v_content := v_actor_name
      || ' änderte die Priorität auf '
      || public.format_case_priority_label(v_new_priority)
      || '.';

    perform public.insert_case_system_timeline_entry(
      v_case.id,
      v_case.agency_id,
      v_user_id,
      'priority_changed',
      v_content,
      null,
      v_metadata,
      now()
    );
    v_changed := true;
  end if;

  if v_old_due is distinct from v_new_due then
    v_metadata := jsonb_build_object(
      'previous_due_at', v_old_due,
      'new_due_at', v_new_due
    );

    if v_new_due is null then
      v_content := v_actor_name || ' hat die Fälligkeit entfernt.';
    elsif v_old_due is null then
      v_content := v_actor_name
        || ' setzte die Fälligkeit auf '
        || to_char(v_new_due, 'DD.MM.YYYY')
        || '.';
    else
      v_content := v_actor_name
        || ' änderte die Fälligkeit auf '
        || to_char(v_new_due, 'DD.MM.YYYY')
        || '.';
    end if;

    perform public.insert_case_system_timeline_entry(
      v_case.id,
      v_case.agency_id,
      v_user_id,
      'due_at_changed',
      v_content,
      null,
      v_metadata,
      now()
    );
    v_changed := true;
  end if;

  if not v_changed then
    return v_case;
  end if;

  return v_case;
end;
$$;

comment on function public.update_case(
  uuid, boolean, text, boolean, uuid, boolean, text, boolean, date
) is
  'Aktualisiert atomar Status/Assignee/Priorität/Fälligkeit eines Nicht-Task-Cases und schreibt Timeline-Ereignisse. completed_at: gesetzt bei completed/cancelled, sonst null.';

revoke all on function public.update_case(uuid, boolean, text, boolean, uuid, boolean, text, boolean, date) from public;
revoke all on function public.update_case(uuid, boolean, text, boolean, uuid, boolean, text, boolean, date) from anon;
revoke all on function public.update_case(uuid, boolean, text, boolean, uuid, boolean, text, boolean, date) from service_role;
grant execute on function public.update_case(uuid, boolean, text, boolean, uuid, boolean, text, boolean, date) to authenticated;
