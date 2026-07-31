-- AgenturOS Punkt 24D: Atomare Task-Erstellung mit Systemereignis task.created

create or replace function public.insert_task_created_timeline_entry(
  p_task_id uuid,
  p_author_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.task_timeline_entries (
    task_id,
    entry_type,
    event_key,
    author_user_id,
    content,
    metadata
  )
  values (
    p_task_id,
    'system',
    'task.created',
    p_author_user_id,
    'Vorgang erstellt.',
    null
  );
end;
$$;

comment on function public.insert_task_created_timeline_entry(uuid, uuid) is
  'Erzeugt intern den festen System-Chronikeintrag task.created. Nicht direkt aufrufbar.';

revoke all on function public.insert_task_created_timeline_entry(uuid, uuid) from public;
revoke all on function public.insert_task_created_timeline_entry(uuid, uuid) from anon;
revoke all on function public.insert_task_created_timeline_entry(uuid, uuid) from authenticated;
revoke all on function public.insert_task_created_timeline_entry(uuid, uuid) from service_role;

create or replace function public.create_task(
  p_title text,
  p_description text default null
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

  v_description := nullif(trim(p_description), '');

  insert into public.tasks (
    user_id,
    created_by,
    agency_id,
    assignee_user_id,
    title,
    description
  )
  values (
    v_user_id,
    v_user_id,
    v_agency_id,
    null,
    trim(p_title),
    v_description
  )
  returning * into v_task;

  perform public.insert_task_created_timeline_entry(v_task.id, v_user_id);

  return v_task;
end;
$$;

comment on function public.create_task(text, text) is
  'Erstellt atomar eine Aufgabe und den System-Chronikeintrag task.created.';

revoke all on function public.create_task(text, text) from public;
revoke all on function public.create_task(text, text) from anon;
revoke all on function public.create_task(text, text) from service_role;
grant execute on function public.create_task(text, text) to authenticated;

create or replace function public.create_task_from_inbox_item(p_inbox_item_id uuid)
returns table (
  inbox_item_id uuid,
  task_id uuid,
  relation_id uuid,
  already_existed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_agency_id uuid;
  v_active_membership_count integer;
  v_inbox public.inbox_items%rowtype;
  v_existing_relation public.inbox_relations%rowtype;
  v_task_id uuid;
  v_relation_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
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

  select *
  into v_inbox
  from public.inbox_items
  where id = p_inbox_item_id
  for update;

  if not found then
    raise exception 'inbox item not found'
      using errcode = 'P0001';
  end if;

  if v_inbox.user_id is distinct from v_user_id then
    raise exception 'access denied'
      using errcode = '42501';
  end if;

  if trim(v_inbox.content) = '' then
    raise exception 'inbox content empty'
      using errcode = 'P0001';
  end if;

  select *
  into v_existing_relation
  from public.inbox_relations
  where inbox_relations.inbox_item_id = p_inbox_item_id
    and inbox_relations.relation_type = 'task';

  if found then
    if v_inbox.processed_at is null then
      update public.inbox_items
      set
        processed_at = now(),
        updated_at = now()
      where id = p_inbox_item_id;
    end if;

    return query
    select
      p_inbox_item_id,
      v_existing_relation.relation_id,
      v_existing_relation.id,
      true;
    return;
  end if;

  insert into public.tasks (
    user_id,
    created_by,
    agency_id,
    assignee_user_id,
    title,
    description
  )
  values (
    v_user_id,
    v_user_id,
    v_agency_id,
    null,
    v_inbox.content,
    null
  )
  returning id into v_task_id;

  perform public.insert_task_created_timeline_entry(v_task_id, v_user_id);

  insert into public.inbox_relations (
    inbox_item_id,
    relation_type,
    relation_id
  )
  values (
    p_inbox_item_id,
    'task',
    v_task_id
  )
  returning id into v_relation_id;

  update public.inbox_items
  set
    processed_at = now(),
    updated_at = now()
  where id = p_inbox_item_id;

  return query
  select
    p_inbox_item_id,
    v_task_id,
    v_relation_id,
    false;
end;
$$;

comment on function public.create_task_from_inbox_item(uuid) is
  'Erstellt atomar eine Aufgabe aus einem Eingangselement inklusive task.created-Chronikeintrag.';

revoke all on function public.create_task_from_inbox_item(uuid) from public;
revoke all on function public.create_task_from_inbox_item(uuid) from anon;
grant execute on function public.create_task_from_inbox_item(uuid) to authenticated;
