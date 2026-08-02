-- AgenturOS Punkt 31A: Generic Inbox Promotion Backend
-- Additiv. Keine Decision-Center-UI. Keine Activity Engine.

-- ---------------------------------------------------------------------------
-- 1. inbox_relations: polymorph + genau ein Hauptziel
-- ---------------------------------------------------------------------------

alter table public.inbox_relations
  drop constraint if exists inbox_relations_relation_id_fkey;

alter table public.inbox_relations
  drop constraint if exists inbox_relations_type_valid;

alter table public.inbox_relations
  add constraint inbox_relations_type_valid
  check (relation_type in ('task', 'case', 'information'));

alter table public.inbox_relations
  drop constraint if exists inbox_relations_inbox_item_type_unique;

-- V1: maximal ein Hauptziel (task | case | information) pro Eingang
create unique index if not exists inbox_relations_one_main_target_unique
  on public.inbox_relations (inbox_item_id)
  where relation_type in ('task', 'case', 'information');

comment on column public.inbox_relations.relation_type is
  'Hauptziel-Typ: task | case | information. Genau eines pro Eingang (V1).';

comment on column public.inbox_relations.relation_id is
  'ID des Zielobjekts (tasks.id | cases.id | information_items.id) je nach relation_type.';

create or replace function public.enforce_inbox_relation_target()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.relation_type = 'task' then
    if not exists (select 1 from public.tasks as t where t.id = new.relation_id) then
      raise exception 'inbox relation target task not found'
        using errcode = 'P0001';
    end if;
  elsif new.relation_type = 'case' then
    if not exists (select 1 from public.cases as c where c.id = new.relation_id) then
      raise exception 'inbox relation target case not found'
        using errcode = 'P0001';
    end if;
  elsif new.relation_type = 'information' then
    if not exists (
      select 1 from public.information_items as i where i.id = new.relation_id
    ) then
      raise exception 'inbox relation target information not found'
        using errcode = 'P0001';
    end if;
  else
    raise exception 'invalid inbox relation type'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists inbox_relations_enforce_target on public.inbox_relations;

create trigger inbox_relations_enforce_target
  before insert or update of relation_type, relation_id
  on public.inbox_relations
  for each row
  execute function public.enforce_inbox_relation_target();

revoke all on function public.enforce_inbox_relation_target() from public;
revoke all on function public.enforce_inbox_relation_target() from anon;
revoke all on function public.enforce_inbox_relation_target() from authenticated;
revoke all on function public.enforce_inbox_relation_target() from service_role;

-- RLS: Client-Insert bleibt task-only; Case/Information nur über SECURITY DEFINER RPCs

drop policy if exists inbox_relations_insert_own on public.inbox_relations;

create policy inbox_relations_insert_own
  on public.inbox_relations
  for insert
  to authenticated
  with check (
    relation_type = 'task'
    and exists (
      select 1
      from public.inbox_items
      where inbox_items.id = inbox_relations.inbox_item_id
        and inbox_items.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.tasks
      where tasks.id = inbox_relations.relation_id
        and tasks.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Hilfsfunktionen
-- ---------------------------------------------------------------------------

create or replace function public.derive_inbox_promotion_title(
  p_content text,
  p_title text default null
)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    when p_title is not null and btrim(p_title) <> '' then left(btrim(p_title), 500)
    else left(btrim(regexp_replace(coalesce(p_content, ''), '\s+', ' ', 'g')), 200)
  end;
$$;

comment on function public.derive_inbox_promotion_title(text, text) is
  'Titel für Promotion: übergebener Titel oder gekürzter Inbox-Inhalt.';

revoke all on function public.derive_inbox_promotion_title(text, text) from public;
revoke all on function public.derive_inbox_promotion_title(text, text) from anon;
revoke all on function public.derive_inbox_promotion_title(text, text) from service_role;
grant execute on function public.derive_inbox_promotion_title(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Task-Promotion erweitern (Dateien + optionale Felder + Idempotenz)
-- ---------------------------------------------------------------------------

drop function if exists public.create_task_from_inbox_item(uuid);

create or replace function public.create_task_from_inbox_item(
  p_inbox_item_id uuid,
  p_title text default null,
  p_description text default null,
  p_assignee_user_id uuid default null,
  p_priority text default null,
  p_due_date date default null,
  p_business_area_key text default null
)
returns table (
  inbox_item_id uuid,
  task_id uuid,
  case_id uuid,
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
  v_existing public.inbox_relations%rowtype;
  v_task_id uuid;
  v_case_id uuid;
  v_relation_id uuid;
  v_title text;
  v_description text;
  v_assignee uuid;
  v_priority text;
  v_business_area_id uuid;
  v_file record;
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

  if btrim(v_inbox.content) = '' then
    raise exception 'inbox content empty'
      using errcode = 'P0001';
  end if;

  v_existing := null;

  select *
  into v_existing
  from public.inbox_relations as r
  where r.inbox_item_id = p_inbox_item_id
    and r.relation_type in ('task', 'case', 'information')
  limit 1;

  if found then
    if v_existing.relation_type is distinct from 'task' then
      raise exception 'inbox item already promoted'
        using errcode = 'P0001';
    end if;

    if v_inbox.processed_at is null then
      update public.inbox_items
      set processed_at = now(), updated_at = now()
      where id = p_inbox_item_id;
    end if;

    select c.id
    into v_case_id
    from public.cases as c
    where c.source_task_id = v_existing.relation_id;

    return query
    select
      p_inbox_item_id,
      v_existing.relation_id,
      v_case_id,
      v_existing.id,
      true;
    return;
  end if;

  v_title := public.derive_inbox_promotion_title(v_inbox.content, p_title);
  if v_title is null or btrim(v_title) = '' then
    raise exception 'title empty'
      using errcode = 'P0001';
  end if;

  v_description := case
    when p_description is not null then nullif(btrim(p_description), '')
    else v_inbox.content
  end;

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

  insert into public.tasks (
    user_id,
    created_by,
    agency_id,
    assignee_user_id,
    title,
    description,
    priority,
    due_date
  )
  values (
    v_user_id,
    v_user_id,
    v_agency_id,
    v_assignee,
    v_title,
    v_description,
    v_priority,
    p_due_date
  )
  returning id into v_task_id;

  perform public.insert_task_created_timeline_entry(v_task_id, v_user_id);

  -- Anhänge: inbox_item_files → task_file_relations (gleiche file_id)
  for v_file in
    select iif.file_id
    from public.inbox_item_files as iif
    where iif.inbox_item_id = p_inbox_item_id
    order by iif.created_at asc, iif.id asc
  loop
    insert into public.task_file_relations (
      agency_id,
      task_id,
      file_id,
      created_by
    )
    values (
      v_agency_id,
      v_task_id,
      v_file.file_id,
      v_user_id
    )
    on conflict on constraint task_file_relations_unique do nothing;
  end loop;

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

  select c.id
  into v_case_id
  from public.cases as c
  where c.source_task_id = v_task_id;

  if p_business_area_key is not null and btrim(p_business_area_key) <> '' then
    v_business_area_id := public.resolve_agency_business_area_id(
      v_agency_id,
      btrim(p_business_area_key)
    );
    if v_business_area_id is null then
      raise exception 'business area not found'
        using errcode = 'P0001';
    end if;

    update public.cases
    set
      business_area_id = v_business_area_id,
      updated_at = now()
    where id = v_case_id;
  end if;

  update public.inbox_items
  set
    processed_at = now(),
    updated_at = now()
  where id = p_inbox_item_id;

  return query
  select
    p_inbox_item_id,
    v_task_id,
    v_case_id,
    v_relation_id,
    false;
end;
$$;

comment on function public.create_task_from_inbox_item(uuid, text, text, uuid, text, date, text) is
  'Erstellt atomar eine Aufgabe aus einem Eingang inkl. Timeline, Datei-Links und Inbox-Relation.';

revoke all on function public.create_task_from_inbox_item(uuid, text, text, uuid, text, date, text) from public;
revoke all on function public.create_task_from_inbox_item(uuid, text, text, uuid, text, date, text) from anon;
revoke all on function public.create_task_from_inbox_item(uuid, text, text, uuid, text, date, text) from service_role;
grant execute on function public.create_task_from_inbox_item(uuid, text, text, uuid, text, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Generischer Non-Task-Case-Writer
-- ---------------------------------------------------------------------------

create or replace function public.create_case_from_inbox_item(
  p_inbox_item_id uuid,
  p_case_type_key text,
  p_business_area_key text default 'general',
  p_assignee_user_id uuid default null,
  p_title text default null,
  p_description text default null,
  p_due_at date default null,
  p_priority text default 'normal'
)
returns table (
  inbox_item_id uuid,
  case_id uuid,
  case_type_key text,
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
  v_existing public.inbox_relations%rowtype;
  v_case_id uuid;
  v_relation_id uuid;
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

  -- Task läuft über create_task_from_inbox_item (Mirror)
  if v_type_key = 'task' then
    raise exception 'use create_task_from_inbox_item for task'
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

  if btrim(v_inbox.content) = '' then
    raise exception 'inbox content empty'
      using errcode = 'P0001';
  end if;

  v_existing := null;

  select *
  into v_existing
  from public.inbox_relations as r
  where r.inbox_item_id = p_inbox_item_id
    and r.relation_type in ('task', 'case', 'information')
  limit 1;

  if found then
    if v_existing.relation_type is distinct from 'case' then
      raise exception 'inbox item already promoted'
        using errcode = 'P0001';
    end if;

    if v_inbox.processed_at is null then
      update public.inbox_items
      set processed_at = now(), updated_at = now()
      where id = p_inbox_item_id;
    end if;

    select ct.key
    into v_type_key
    from public.cases as c
    join public.case_types as ct on ct.id = c.case_type_id
    where c.id = v_existing.relation_id;

    return query
    select
      p_inbox_item_id,
      v_existing.relation_id,
      coalesce(v_type_key, p_case_type_key),
      v_existing.id,
      true;
    return;
  end if;

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

  v_title := public.derive_inbox_promotion_title(v_inbox.content, p_title);
  if v_title is null or btrim(v_title) = '' then
    raise exception 'title empty'
      using errcode = 'P0001';
  end if;

  v_description := case
    when p_description is not null then nullif(btrim(p_description), '')
    else v_inbox.content
  end;

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
    due_at,
    source_inbox_item_id
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
    p_due_at,
    p_inbox_item_id
  )
  returning id into v_case_id;

  insert into public.inbox_relations (
    inbox_item_id,
    relation_type,
    relation_id
  )
  values (
    p_inbox_item_id,
    'case',
    v_case_id
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
    v_case_id,
    v_type_key,
    v_relation_id,
    false;
end;
$$;

comment on function public.create_case_from_inbox_item(uuid, text, text, uuid, text, text, date, text) is
  'Erstellt atomar einen Non-Task-Case aus einem Eingang inkl. Relation und processed_at.';

revoke all on function public.create_case_from_inbox_item(uuid, text, text, uuid, text, text, date, text) from public;
revoke all on function public.create_case_from_inbox_item(uuid, text, text, uuid, text, text, date, text) from anon;
revoke all on function public.create_case_from_inbox_item(uuid, text, text, uuid, text, text, date, text) from service_role;
grant execute on function public.create_case_from_inbox_item(uuid, text, text, uuid, text, text, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Information-Promotion
-- ---------------------------------------------------------------------------

create or replace function public.create_information_from_inbox_item(
  p_inbox_item_id uuid,
  p_title text default null,
  p_content text default null,
  p_collection_key text default 'general'
)
returns table (
  inbox_item_id uuid,
  information_id uuid,
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
  v_existing public.inbox_relations%rowtype;
  v_information_id uuid;
  v_relation_id uuid;
  v_collection_id uuid;
  v_title text;
  v_content text;
  v_collection_key text;
  v_file record;
  v_order integer := 0;
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

  if btrim(v_inbox.content) = '' then
    raise exception 'inbox content empty'
      using errcode = 'P0001';
  end if;

  v_existing := null;

  select *
  into v_existing
  from public.inbox_relations as r
  where r.inbox_item_id = p_inbox_item_id
    and r.relation_type in ('task', 'case', 'information')
  limit 1;

  if found then
    if v_existing.relation_type is distinct from 'information' then
      raise exception 'inbox item already promoted'
        using errcode = 'P0001';
    end if;

    if v_inbox.processed_at is null then
      update public.inbox_items
      set processed_at = now(), updated_at = now()
      where id = p_inbox_item_id;
    end if;

    return query
    select
      p_inbox_item_id,
      v_existing.relation_id,
      v_existing.id,
      true;
    return;
  end if;

  v_collection_key := coalesce(nullif(btrim(p_collection_key), ''), 'general');
  v_collection_id := public.resolve_agency_knowledge_collection_id(v_agency_id, v_collection_key);
  if v_collection_id is null then
    perform public.seed_default_knowledge_collections_for_agency(v_agency_id);
    v_collection_id := public.resolve_agency_knowledge_collection_id(v_agency_id, v_collection_key);
  end if;
  if v_collection_id is null then
    raise exception 'knowledge collection not found'
      using errcode = 'P0001';
  end if;

  v_title := public.derive_inbox_promotion_title(v_inbox.content, p_title);
  if v_title is null or btrim(v_title) = '' then
    raise exception 'title empty'
      using errcode = 'P0001';
  end if;

  v_content := case
    when p_content is not null then nullif(btrim(p_content), '')
    else v_inbox.content
  end;

  insert into public.information_items (
    user_id,
    created_by,
    agency_id,
    knowledge_collection_id,
    title,
    content
  )
  values (
    v_user_id,
    v_user_id,
    v_agency_id,
    v_collection_id,
    v_title,
    v_content
  )
  returning id into v_information_id;

  for v_file in
    select iif.file_id, iif.created_at, iif.id
    from public.inbox_item_files as iif
    where iif.inbox_item_id = p_inbox_item_id
    order by iif.created_at asc, iif.id asc
  loop
    insert into public.information_item_files (
      information_id,
      file_id,
      display_order
    )
    values (
      v_information_id,
      v_file.file_id,
      v_order
    )
    on conflict on constraint information_item_files_unique do nothing;

    v_order := v_order + 1;
  end loop;

  insert into public.inbox_relations (
    inbox_item_id,
    relation_type,
    relation_id
  )
  values (
    p_inbox_item_id,
    'information',
    v_information_id
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
    v_information_id,
    v_relation_id,
    false;
end;
$$;

comment on function public.create_information_from_inbox_item(uuid, text, text, text) is
  'Erstellt atomar Knowledge aus einem Eingang inkl. Datei-Relinks und Inbox-Relation.';

revoke all on function public.create_information_from_inbox_item(uuid, text, text, text) from public;
revoke all on function public.create_information_from_inbox_item(uuid, text, text, text) from anon;
revoke all on function public.create_information_from_inbox_item(uuid, text, text, text) from service_role;
grant execute on function public.create_information_from_inbox_item(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Originaleingang für Agency-Mitglieder lesbar (über Case-Herkunft)
-- ---------------------------------------------------------------------------

drop policy if exists inbox_items_select_own on public.inbox_items;

create policy inbox_items_select_own_or_case_origin
  on public.inbox_items
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.cases as c
      where c.source_inbox_item_id = inbox_items.id
        and public.user_has_active_agency_membership(c.agency_id)
    )
  );

comment on policy inbox_items_select_own_or_case_origin on public.inbox_items is
  'Eigentümer oder Agency-Mitglied über cases.source_inbox_item_id.';

drop policy if exists inbox_item_files_select_own on public.inbox_item_files;

create policy inbox_item_files_select_own_or_case_origin
  on public.inbox_item_files
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.inbox_items as i
      where i.id = inbox_item_files.inbox_item_id
        and (
          i.user_id = (select auth.uid())
          or exists (
            select 1
            from public.cases as c
            where c.source_inbox_item_id = i.id
              and public.user_has_active_agency_membership(c.agency_id)
          )
        )
    )
  );

comment on policy inbox_item_files_select_own_or_case_origin on public.inbox_item_files is
  'Eigentümer oder Agency-Mitglied über cases.source_inbox_item_id.';

-- files / storage: Agency-Lesen über Case-Ursprung (ohne case_file_relations)

drop policy if exists files_select_own_or_task_linked on public.files;

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
    or exists (
      select 1
      from public.inbox_item_files as iif
      inner join public.cases as c on c.source_inbox_item_id = iif.inbox_item_id
      where iif.file_id = files.id
        and public.user_has_active_agency_membership(c.agency_id)
    )
  );

comment on policy files_select_own_or_task_or_case_origin on public.files is
  'Eigentümer, Task-Verknüpfung oder Case-Ursprung (source_inbox_item_id).';

create policy user_files_storage_select_case_origin
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'user-files'
    and exists (
      select 1
      from public.files as f
      inner join public.inbox_item_files as iif on iif.file_id = f.id
      inner join public.cases as c on c.source_inbox_item_id = iif.inbox_item_id
      where f.storage_path = storage.objects.name
        and public.user_has_active_agency_membership(c.agency_id)
    )
  );

comment on policy user_files_storage_select_case_origin on storage.objects is
  'Agenturmitglieder dürfen Storage-Objekte lesen, die über Case-Ursprung verknüpft sind.';
