-- AgenturOS Punkt 31E.3: Einheitlicher Vorgangsverlauf
-- Erweitert case_timeline_entries (keine parallelen Verlaufstabellen).

-- ---------------------------------------------------------------------------
-- 1. Schema: file_id + metadata + erweiterte Event-Typen
-- ---------------------------------------------------------------------------

alter table public.case_timeline_entries
  add column if not exists file_id uuid references public.files (id) on delete set null,
  add column if not exists metadata jsonb;

comment on column public.case_timeline_entries.file_id is
  'Optionaler Dateibezug für event_type=attachment.';

comment on column public.case_timeline_entries.metadata is
  'Optionale Zusatzdaten (z. B. file_name, task_id).';

alter table public.case_timeline_entries
  drop constraint if exists case_timeline_entries_event_type_valid;

alter table public.case_timeline_entries
  add constraint case_timeline_entries_event_type_valid check (
    event_type in (
      'created',
      'note',
      'attachment',
      'task_created',
      'task_completed'
    )
  );

alter table public.case_timeline_entries
  drop constraint if exists case_timeline_entries_attachment_file_required;

alter table public.case_timeline_entries
  add constraint case_timeline_entries_attachment_file_required check (
    (
      event_type = 'attachment'
      and file_id is not null
    )
    or (
      event_type <> 'attachment'
      and file_id is null
    )
  );

create index if not exists case_timeline_entries_file_id_idx
  on public.case_timeline_entries (file_id)
  where file_id is not null;

-- ---------------------------------------------------------------------------
-- 2. System-Einträge (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

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
       'task_completed'
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

comment on function public.insert_case_system_timeline_entry(uuid, uuid, uuid, text, text, uuid, jsonb, timestamptz) is
  'Fügt einen System-Verlaufseintrag in case_timeline_entries ein (append-only).';

revoke all on function public.insert_case_system_timeline_entry(uuid, uuid, uuid, text, text, uuid, jsonb, timestamptz) from public;
revoke all on function public.insert_case_system_timeline_entry(uuid, uuid, uuid, text, text, uuid, jsonb, timestamptz) from anon;
revoke all on function public.insert_case_system_timeline_entry(uuid, uuid, uuid, text, text, uuid, jsonb, timestamptz) from authenticated;
revoke all on function public.insert_case_system_timeline_entry(uuid, uuid, uuid, text, text, uuid, jsonb, timestamptz) from service_role;

-- Created-Trigger auf Helper umstellen
create or replace function public.insert_case_created_timeline_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.insert_case_system_timeline_entry(
    new.id,
    new.agency_id,
    new.created_by,
    'created',
    'Vorgang erstellt',
    null,
    null,
    new.created_at
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Datei an Vorgang anhängen → Timeline-Eintrag attachment
-- ---------------------------------------------------------------------------

create or replace function public.attach_file_to_case(
  p_case_id uuid,
  p_file_id uuid
)
returns public.case_timeline_entries
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_case public.cases%rowtype;
  v_file public.files%rowtype;
  v_entry public.case_timeline_entries%rowtype;
  v_metadata jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  select *
  into v_case
  from public.cases
  where id = p_case_id;

  if not found then
    raise exception 'case not found'
      using errcode = 'P0001';
  end if;

  if not public.user_has_active_agency_membership(v_case.agency_id) then
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

  v_metadata := jsonb_build_object(
    'file_id', p_file_id,
    'file_name', trim(v_file.filename),
    'mime_type', v_file.mime_type,
    'size_bytes', v_file.size_bytes
  );

  insert into public.case_timeline_entries (
    case_id,
    agency_id,
    created_by,
    event_type,
    content,
    file_id,
    metadata
  )
  values (
    v_case.id,
    v_case.agency_id,
    v_user_id,
    'attachment',
    trim(v_file.filename),
    p_file_id,
    v_metadata
  )
  returning * into v_entry;

  return v_entry;
end;
$$;

comment on function public.attach_file_to_case(uuid, uuid) is
  'Hängt eine Datei an einen Vorgang und erzeugt den Verlaufseintrag attachment.';

revoke all on function public.attach_file_to_case(uuid, uuid) from public;
revoke all on function public.attach_file_to_case(uuid, uuid) from anon;
revoke all on function public.attach_file_to_case(uuid, uuid) from service_role;
grant execute on function public.attach_file_to_case(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Task-Ereignisse in Case-Timeline (wenn tasks.case_id gesetzt)
-- ---------------------------------------------------------------------------

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

  if v_task.case_id is not null then
    perform public.insert_case_system_timeline_entry(
      v_task.case_id,
      v_task.agency_id,
      v_user_id,
      'task_completed',
      'Aufgabe abgeschlossen: „' || trim(v_task.title) || '“',
      null,
      jsonb_build_object(
        'task_id', v_task.id,
        'task_title', trim(v_task.title)
      ),
      now()
    );
  end if;

  return v_task;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Dateizugriff über Case-Timeline
-- ---------------------------------------------------------------------------

create or replace function public.user_can_access_file_via_case_timeline(
  p_file_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if p_file_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.case_timeline_entries as e
    where e.file_id = p_file_id
      and e.event_type = 'attachment'
      and public.user_has_active_agency_membership(e.agency_id)
  );
end;
$$;

comment on function public.user_can_access_file_via_case_timeline(uuid) is
  'True, wenn die Datei über einen Case-Timeline-Anhang der Agency erreichbar ist.';

revoke all on function public.user_can_access_file_via_case_timeline(uuid) from public;
revoke all on function public.user_can_access_file_via_case_timeline(uuid) from anon;
revoke all on function public.user_can_access_file_via_case_timeline(uuid) from service_role;
grant execute on function public.user_can_access_file_via_case_timeline(uuid) to authenticated;

drop policy if exists files_select_own_or_task_or_case_origin on public.files;

create policy files_select_own_or_task_or_case_origin
  on public.files
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.task_file_relations as relation
      inner join public.tasks as task on task.id = relation.task_id
      where relation.file_id = files.id
        and relation.agency_id = task.agency_id
        and public.user_has_active_agency_membership(task.agency_id)
    )
    or public.user_can_access_file_via_case_origin(files.id)
    or public.user_can_access_file_via_case_timeline(files.id)
  );

comment on policy files_select_own_or_task_or_case_origin on public.files is
  'Eigentümer, Task-Verknüpfung, Case-Ursprung oder Case-Timeline-Anhang.';

drop policy if exists user_files_storage_select_case_timeline on storage.objects;

create policy user_files_storage_select_case_timeline
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'user-files'
    and exists (
      select 1
      from public.files as f
      where f.storage_path = storage.objects.name
        and public.user_can_access_file_via_case_timeline(f.id)
    )
  );

comment on policy user_files_storage_select_case_timeline on storage.objects is
  'Agenturmitglieder dürfen Storage-Objekte lesen, die über Case-Timeline-Anhänge freigegeben sind.';
