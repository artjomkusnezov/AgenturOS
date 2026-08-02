-- AgenturOS Punkt 32B: Direkte Case-Erstellung (ohne Eingang)
-- Gleiche Validierung wie create_case_from_inbox_item, ohne Inbox-Relation.

create or replace function public.create_case(
  p_case_type_key text,
  p_title text,
  p_description text default null,
  p_business_area_key text default 'general',
  p_assignee_user_id uuid default null,
  p_due_at date default null,
  p_priority text default 'normal'
)
returns table (
  case_id uuid,
  case_type_key text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_agency_id uuid;
  v_active_membership_count integer;
  v_case_id uuid;
  v_case_type_id uuid;
  v_business_area_id uuid;
  v_title text;
  v_description text;
  v_assignee uuid;
  v_priority text;
  v_type_key text;
  v_area_key text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  v_type_key := btrim(coalesce(p_case_type_key, ''));
  if v_type_key = '' then
    raise exception 'case type required'
      using errcode = 'P0001';
  end if;

  if v_type_key = 'task' then
    raise exception 'use create_task_for_current_user for task'
      using errcode = 'P0001';
  end if;

  if v_type_key not in ('offer', 'claim', 'follow_up', 'general') then
    raise exception 'invalid case type'
      using errcode = 'P0001';
  end if;

  if v_type_key = 'follow_up' and p_due_at is null then
    raise exception 'due_at required for follow_up'
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

  v_case_type_id := public.resolve_system_case_type_id(v_type_key);
  if v_case_type_id is null then
    raise exception 'invalid case type'
      using errcode = 'P0001';
  end if;

  v_area_key := coalesce(nullif(btrim(p_business_area_key), ''), 'general');
  v_business_area_id := public.resolve_agency_business_area_id(v_agency_id, v_area_key);
  if v_business_area_id is null then
    perform public.seed_default_business_areas_for_agency(v_agency_id);
    v_business_area_id := public.resolve_agency_business_area_id(v_agency_id, v_area_key);
  end if;
  if v_business_area_id is null then
    raise exception 'business area not found'
      using errcode = 'P0001';
  end if;

  v_title := nullif(btrim(coalesce(p_title, '')), '');
  if v_title is null then
    raise exception 'title empty'
      using errcode = 'P0001';
  end if;

  v_description := nullif(btrim(coalesce(p_description, '')), '');

  v_assignee := coalesce(p_assignee_user_id, v_user_id);
  if not public.user_is_active_member_of_agency(v_assignee, v_agency_id) then
    raise exception 'assignee not active agency member'
      using errcode = 'P0001';
  end if;

  v_priority := coalesce(nullif(btrim(p_priority), ''), 'normal');
  if v_priority not in ('low', 'normal', 'high') then
    raise exception 'invalid priority'
      using errcode = 'P0001';
  end if;

  insert into public.cases (
    agency_id,
    created_by,
    assignee_user_id,
    case_type_id,
    business_area_id,
    title,
    description,
    core_status,
    priority,
    due_at
  )
  values (
    v_agency_id,
    v_user_id,
    v_assignee,
    v_case_type_id,
    v_business_area_id,
    v_title,
    v_description,
    'open',
    v_priority,
    p_due_at
  )
  returning id into v_case_id;

  return query
  select
    v_case_id,
    v_type_key;
end;
$$;

comment on function public.create_case(text, text, text, text, uuid, date, text) is
  'Erstellt einen Non-Task-Vorgang direkt (ohne Eingang).';

revoke all on function public.create_case(text, text, text, text, uuid, date, text) from public;
revoke all on function public.create_case(text, text, text, text, uuid, date, text) from anon;
revoke all on function public.create_case(text, text, text, text, uuid, date, text) from service_role;
grant execute on function public.create_case(text, text, text, text, uuid, date, text) to authenticated;
