-- AgenturOS Punkt 26B: Atomare Systemereignisse für Vorgangs-Chronik

create or replace function public.resolve_profile_display_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    nullif(trim(p.display_name), ''),
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    'Unbenanntes Mitglied'
  )
  from public.profiles as p
  where p.id = p_user_id;
$$;

comment on function public.resolve_profile_display_name(uuid) is
  'Löst einen Anzeigenamen aus profiles auf; Fallback Unbenanntes Mitglied.';

revoke all on function public.resolve_profile_display_name(uuid) from public;
revoke all on function public.resolve_profile_display_name(uuid) from anon;
revoke all on function public.resolve_profile_display_name(uuid) from authenticated;
revoke all on function public.resolve_profile_display_name(uuid) from service_role;

create or replace function public.resolve_timeline_actor_name(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_name text;
begin
  if p_user_id is null then
    return 'Ein Agenturmitglied';
  end if;

  select public.resolve_profile_display_name(p_user_id)
  into v_name;

  if v_name is null or v_name = 'Unbenanntes Mitglied' then
    return 'Ein Agenturmitglied';
  end if;

  return v_name;
end;
$$;

comment on function public.resolve_timeline_actor_name(uuid) is
  'Anzeigename für Chroniktexte; neutraler Fallback Ein Agenturmitglied.';

revoke all on function public.resolve_timeline_actor_name(uuid) from public;
revoke all on function public.resolve_timeline_actor_name(uuid) from anon;
revoke all on function public.resolve_timeline_actor_name(uuid) from authenticated;
revoke all on function public.resolve_timeline_actor_name(uuid) from service_role;

create or replace function public.insert_task_system_timeline_entry(
  p_task_id uuid,
  p_author_user_id uuid,
  p_event_key text,
  p_content text,
  p_metadata jsonb default null
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
    p_event_key,
    p_author_user_id,
    p_content,
    p_metadata
  );
end;
$$;

comment on function public.insert_task_system_timeline_entry(uuid, uuid, text, text, jsonb) is
  'Erzeugt intern einen System-Chronikeintrag. Nicht direkt aufrufbar.';

revoke all on function public.insert_task_system_timeline_entry(uuid, uuid, text, text, jsonb) from public;
revoke all on function public.insert_task_system_timeline_entry(uuid, uuid, text, text, jsonb) from anon;
revoke all on function public.insert_task_system_timeline_entry(uuid, uuid, text, text, jsonb) from authenticated;
revoke all on function public.insert_task_system_timeline_entry(uuid, uuid, text, text, jsonb) from service_role;

create or replace function public.complete_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_task public.tasks%rowtype;
  v_actor_name text;
  v_content text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  select *
  into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'task not found'
      using errcode = 'P0001';
  end if;

  if not public.user_has_active_agency_membership(v_task.agency_id) then
    raise exception 'access denied'
      using errcode = '42501';
  end if;

  if v_task.completed_at is not null then
    raise exception 'task already completed'
      using errcode = 'P0001';
  end if;

  update public.tasks
  set
    completed_at = now(),
    updated_at = now()
  where id = p_task_id
  returning * into v_task;

  v_actor_name := public.resolve_timeline_actor_name(v_user_id);
  v_content := v_actor_name || ' hat den Vorgang „' || trim(v_task.title) || '“ abgeschlossen.';

  perform public.insert_task_system_timeline_entry(
    p_task_id,
    v_user_id,
    'task.completed',
    v_content,
    null
  );

  return v_task;
end;
$$;

comment on function public.complete_task(uuid) is
  'Schließt atomar einen Vorgang ab und erzeugt den Chronikeintrag task.completed.';

revoke all on function public.complete_task(uuid) from public;
revoke all on function public.complete_task(uuid) from anon;
revoke all on function public.complete_task(uuid) from service_role;
grant execute on function public.complete_task(uuid) to authenticated;

create or replace function public.reopen_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_task public.tasks%rowtype;
  v_actor_name text;
  v_content text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  select *
  into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'task not found'
      using errcode = 'P0001';
  end if;

  if not public.user_has_active_agency_membership(v_task.agency_id) then
    raise exception 'access denied'
      using errcode = '42501';
  end if;

  if v_task.completed_at is null then
    raise exception 'task already open'
      using errcode = 'P0001';
  end if;

  update public.tasks
  set
    completed_at = null,
    updated_at = now()
  where id = p_task_id
  returning * into v_task;

  v_actor_name := public.resolve_timeline_actor_name(v_user_id);
  v_content := v_actor_name || ' hat den Vorgang „' || trim(v_task.title) || '“ wieder geöffnet.';

  perform public.insert_task_system_timeline_entry(
    p_task_id,
    v_user_id,
    'task.reopened',
    v_content,
    null
  );

  return v_task;
end;
$$;

comment on function public.reopen_task(uuid) is
  'Öffnet atomar einen abgeschlossenen Vorgang wieder und erzeugt den Chronikeintrag task.reopened.';

revoke all on function public.reopen_task(uuid) from public;
revoke all on function public.reopen_task(uuid) from anon;
revoke all on function public.reopen_task(uuid) from service_role;
grant execute on function public.reopen_task(uuid) to authenticated;

create or replace function public.update_task_assignee(
  p_task_id uuid,
  p_assignee_user_id uuid default null
)
returns public.tasks
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_task public.tasks%rowtype;
  v_old_assignee_user_id uuid;
  v_actor_name text;
  v_new_assignee_name text;
  v_content text;
  v_metadata jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  select *
  into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'task not found'
      using errcode = 'P0001';
  end if;

  if not public.user_has_active_agency_membership(v_task.agency_id) then
    raise exception 'access denied'
      using errcode = '42501';
  end if;

  if p_assignee_user_id is not null
    and not public.user_is_active_member_of_agency(p_assignee_user_id, v_task.agency_id) then
    raise exception 'assignee not an active agency member'
      using errcode = 'P0001';
  end if;

  v_old_assignee_user_id := v_task.assignee_user_id;

  if v_old_assignee_user_id is not distinct from p_assignee_user_id then
    return v_task;
  end if;

  update public.tasks
  set
    assignee_user_id = p_assignee_user_id,
    updated_at = now()
  where id = p_task_id
  returning * into v_task;

  v_actor_name := public.resolve_timeline_actor_name(v_user_id);
  v_metadata := jsonb_build_object(
    'previous_assignee_user_id', v_old_assignee_user_id,
    'new_assignee_user_id', p_assignee_user_id
  );

  if p_assignee_user_id is null then
    v_content := v_actor_name || ' hat „' || trim(v_task.title) || '“ als allgemeine Aufgabe freigegeben.';
  elsif p_assignee_user_id = v_user_id then
    v_content := v_actor_name || ' hat die Verantwortung für „' || trim(v_task.title) || '“ übernommen.';
  else
    v_new_assignee_name := public.resolve_timeline_actor_name(p_assignee_user_id);
    v_content := v_actor_name || ' hat die Verantwortung für „' || trim(v_task.title) || '“ an '
      || v_new_assignee_name || ' übergeben.';
  end if;

  perform public.insert_task_system_timeline_entry(
    p_task_id,
    v_user_id,
    'task.assignee_changed',
    v_content,
    v_metadata
  );

  return v_task;
end;
$$;

comment on function public.update_task_assignee(uuid, uuid) is
  'Ändert atomar die Verantwortung eines Vorgangs und erzeugt bei echter Änderung task.assignee_changed.';

revoke all on function public.update_task_assignee(uuid, uuid) from public;
revoke all on function public.update_task_assignee(uuid, uuid) from anon;
revoke all on function public.update_task_assignee(uuid, uuid) from service_role;
grant execute on function public.update_task_assignee(uuid, uuid) to authenticated;

create or replace function public.attach_file_to_task(
  p_task_id uuid,
  p_file_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_task public.tasks%rowtype;
  v_file public.files%rowtype;
  v_relation_id uuid;
  v_actor_name text;
  v_content text;
  v_metadata jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  select *
  into v_task
  from public.tasks
  where id = p_task_id;

  if not found then
    raise exception 'task not found'
      using errcode = 'P0001';
  end if;

  if not public.user_has_active_agency_membership(v_task.agency_id) then
    raise exception 'access denied'
      using errcode = '42501';
  end if;

  select *
  into v_file
  from public.files
  where id = p_file_id;

  if not found then
    raise exception 'file not found'
      using errcode = 'P0001';
  end if;

  if v_file.user_id is distinct from v_user_id then
    raise exception 'access denied'
      using errcode = '42501';
  end if;

  insert into public.task_file_relations (
    agency_id,
    task_id,
    file_id,
    created_by
  )
  values (
    v_task.agency_id,
    p_task_id,
    p_file_id,
    v_user_id
  )
  on conflict on constraint task_file_relations_unique do nothing
  returning id into v_relation_id;

  if v_relation_id is null then
    raise exception 'file already linked'
      using errcode = 'P0001';
  end if;

  v_actor_name := public.resolve_timeline_actor_name(v_user_id);
  v_metadata := jsonb_build_object(
    'file_id', p_file_id,
    'file_name', trim(v_file.filename)
  );
  v_content := v_actor_name || ' hat die Datei „' || trim(v_file.filename)
    || '“ mit dem Vorgang „' || trim(v_task.title) || '“ verknüpft.';

  perform public.insert_task_system_timeline_entry(
    p_task_id,
    v_user_id,
    'task.file_linked',
    v_content,
    v_metadata
  );
end;
$$;

comment on function public.attach_file_to_task(uuid, uuid) is
  'Verknüpft atomar eine Datei mit einem Vorgang und erzeugt den Chronikeintrag task.file_linked.';

revoke all on function public.attach_file_to_task(uuid, uuid) from public;
revoke all on function public.attach_file_to_task(uuid, uuid) from anon;
revoke all on function public.attach_file_to_task(uuid, uuid) from service_role;
grant execute on function public.attach_file_to_task(uuid, uuid) to authenticated;

create or replace function public.attach_information_to_task(
  p_task_id uuid,
  p_information_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_task public.tasks%rowtype;
  v_information public.information_items%rowtype;
  v_relation_id uuid;
  v_actor_name text;
  v_content text;
  v_metadata jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  select *
  into v_task
  from public.tasks
  where id = p_task_id;

  if not found then
    raise exception 'task not found'
      using errcode = 'P0001';
  end if;

  if not public.user_has_active_agency_membership(v_task.agency_id) then
    raise exception 'access denied'
      using errcode = '42501';
  end if;

  select *
  into v_information
  from public.information_items
  where id = p_information_id;

  if not found then
    raise exception 'information not found'
      using errcode = 'P0001';
  end if;

  if v_information.user_id is distinct from v_user_id then
    raise exception 'access denied'
      using errcode = '42501';
  end if;

  insert into public.task_information_relations (
    agency_id,
    task_id,
    information_id,
    created_by
  )
  values (
    v_task.agency_id,
    p_task_id,
    p_information_id,
    v_user_id
  )
  on conflict on constraint task_information_relations_unique do nothing
  returning id into v_relation_id;

  if v_relation_id is null then
    raise exception 'information already linked'
      using errcode = 'P0001';
  end if;

  v_actor_name := public.resolve_timeline_actor_name(v_user_id);
  v_metadata := jsonb_build_object(
    'information_id', p_information_id,
    'information_title', trim(v_information.title)
  );
  v_content := v_actor_name || ' hat die Information „' || trim(v_information.title)
    || '“ mit dem Vorgang „' || trim(v_task.title) || '“ verknüpft.';

  perform public.insert_task_system_timeline_entry(
    p_task_id,
    v_user_id,
    'task.information_linked',
    v_content,
    v_metadata
  );
end;
$$;

comment on function public.attach_information_to_task(uuid, uuid) is
  'Verknüpft atomar eine Information mit einem Vorgang und erzeugt den Chronikeintrag task.information_linked.';

revoke all on function public.attach_information_to_task(uuid, uuid) from public;
revoke all on function public.attach_information_to_task(uuid, uuid) from anon;
revoke all on function public.attach_information_to_task(uuid, uuid) from service_role;
grant execute on function public.attach_information_to_task(uuid, uuid) to authenticated;
