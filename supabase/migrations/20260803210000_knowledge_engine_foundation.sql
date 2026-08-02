-- AgenturOS Punkt 30G: Knowledge Engine Foundation
-- Additiv. Keine UX-/Navigations-/Dashboard-Änderung.
-- information_items wird agency-scoped Knowledge; Collections nur Konfiguration.

-- ---------------------------------------------------------------------------
-- 1. knowledge_collections (pro Agency)
-- ---------------------------------------------------------------------------

create table public.knowledge_collections (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  key text not null,
  label text not null,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_collections_key_not_empty check (trim(key) <> ''),
  constraint knowledge_collections_label_not_empty check (trim(label) <> ''),
  constraint knowledge_collections_agency_key_unique unique (agency_id, key)
);

comment on table public.knowledge_collections is
  'Agenturweite Wissens-Collections. Neue Collections entstehen nur per Datenbankeintrag.';

comment on column public.knowledge_collections.is_system is
  'System-Seed (z. B. general/Allgemein). Nicht löschbar in späteren UI-Schritten.';

create index knowledge_collections_agency_id_idx
  on public.knowledge_collections (agency_id);

create index knowledge_collections_agency_active_sort_idx
  on public.knowledge_collections (agency_id, is_active, sort_order);

create or replace function public.seed_default_knowledge_collections_for_agency(
  p_agency_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_agency_id is null then
    raise exception 'agency_id is required'
      using errcode = 'P0001';
  end if;

  insert into public.knowledge_collections (
    agency_id,
    key,
    label,
    icon,
    sort_order,
    is_active,
    is_system
  )
  select
    p_agency_id,
    v.key,
    v.label,
    v.icon,
    v.sort_order,
    true,
    v.is_system
  from (
    values
      ('general', 'Allgemein', 'general', 10, true),
      ('mortgage', 'Baufinanzierung', 'mortgage', 20, false),
      ('claims', 'Schaden', 'claim', 30, false),
      ('sales', 'Vertrieb', 'sales', 40, false),
      ('contracts', 'Verträge', 'contract', 50, false),
      ('processes', 'Prozesse', 'processes', 60, false)
  ) as v(key, label, icon, sort_order, is_system)
  on conflict (agency_id, key) do nothing;
end;
$$;

comment on function public.seed_default_knowledge_collections_for_agency(uuid) is
  'Legt die sechs Standard-Knowledge-Collections für eine Agentur idempotent an.';

revoke all on function public.seed_default_knowledge_collections_for_agency(uuid) from public;
revoke all on function public.seed_default_knowledge_collections_for_agency(uuid) from anon;
revoke all on function public.seed_default_knowledge_collections_for_agency(uuid) from authenticated;
revoke all on function public.seed_default_knowledge_collections_for_agency(uuid) from service_role;

create or replace function public.resolve_agency_knowledge_collection_id(
  p_agency_id uuid,
  p_key text
)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select kc.id
  from public.knowledge_collections as kc
  where kc.agency_id = p_agency_id
    and kc.key = p_key
  limit 1;
$$;

comment on function public.resolve_agency_knowledge_collection_id(uuid, text) is
  'Lädt die Knowledge-Collection-ID einer Agentur anhand des Keys.';

revoke all on function public.resolve_agency_knowledge_collection_id(uuid, text) from public;
revoke all on function public.resolve_agency_knowledge_collection_id(uuid, text) from anon;
revoke all on function public.resolve_agency_knowledge_collection_id(uuid, text) from authenticated;
revoke all on function public.resolve_agency_knowledge_collection_id(uuid, text) from service_role;

-- Seeds für alle bestehenden Agencies

do $$
declare
  r record;
begin
  for r in select id from public.agencies
  loop
    perform public.seed_default_knowledge_collections_for_agency(r.id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. information_items → agency-scoped Knowledge
-- ---------------------------------------------------------------------------

alter table public.information_items
  add column agency_id uuid,
  add column created_by uuid,
  add column knowledge_collection_id uuid;

comment on column public.information_items.agency_id is
  'Fachliche Agenturzugehörigkeit der Information (gemeinsames Wissenssystem).';

comment on column public.information_items.created_by is
  'Ursprünglicher Ersteller; nach Anlage unveränderlich.';

comment on column public.information_items.knowledge_collection_id is
  'Primäre Knowledge-Collection (V1: genau eine Collection pro Information).';

comment on table public.information_items is
  'Agenturweites Knowledge. Bleibt eigenständig; Cases und Tasks referenzieren nur.';

-- Backfill-Guard: genau eine aktive Agenturmitgliedschaft je user_id

do $$
declare
  v_invalid_count integer;
begin
  select count(*)::integer
  into v_invalid_count
  from public.information_items as i
  where (
    select count(*)::integer
    from public.agency_memberships as m
    where m.user_id = i.user_id
      and m.status = 'active'::public.membership_status
  ) <> 1;

  if v_invalid_count > 0 then
    raise exception
      'information backfill aborted: % item(s) without exactly one active agency membership',
      v_invalid_count
      using errcode = 'P0001';
  end if;
end;
$$;

update public.information_items as i
set
  created_by = i.user_id,
  agency_id = (
    select m.agency_id
    from public.agency_memberships as m
    where m.user_id = i.user_id
      and m.status = 'active'::public.membership_status
  );

update public.information_items as i
set knowledge_collection_id = public.resolve_agency_knowledge_collection_id(
  i.agency_id,
  'general'
)
where i.agency_id is not null;

do $$
declare
  v_incomplete_count integer;
begin
  select count(*)::integer
  into v_incomplete_count
  from public.information_items as i
  where i.agency_id is null
     or i.created_by is null
     or i.knowledge_collection_id is null;

  if v_incomplete_count > 0 then
    raise exception
      'information backfill aborted: % item(s) missing agency_id, created_by or knowledge_collection_id',
      v_incomplete_count
      using errcode = 'P0001';
  end if;
end;
$$;

alter table public.information_items
  alter column agency_id set not null,
  alter column created_by set not null,
  alter column knowledge_collection_id set not null;

alter table public.information_items
  add constraint information_items_agency_id_fkey
    foreign key (agency_id)
    references public.agencies (id)
    on delete restrict,
  add constraint information_items_created_by_fkey
    foreign key (created_by)
    references auth.users (id)
    on delete restrict,
  add constraint information_items_knowledge_collection_id_fkey
    foreign key (knowledge_collection_id)
    references public.knowledge_collections (id)
    on delete restrict;

create index information_items_agency_id_idx
  on public.information_items (agency_id);

create index information_items_agency_id_updated_at_idx
  on public.information_items (agency_id, updated_at desc);

create index information_items_knowledge_collection_id_idx
  on public.information_items (knowledge_collection_id);

create index information_items_created_by_idx
  on public.information_items (created_by);

-- Collection muss zur gleichen Agency gehören

create or replace function public.enforce_information_collection_agency()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_collection_agency_id uuid;
begin
  select kc.agency_id
  into v_collection_agency_id
  from public.knowledge_collections as kc
  where kc.id = new.knowledge_collection_id;

  if v_collection_agency_id is null then
    raise exception 'knowledge collection not found'
      using errcode = 'P0001';
  end if;

  if v_collection_agency_id is distinct from new.agency_id then
    raise exception 'knowledge collection must belong to the same agency'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists information_items_enforce_collection_agency on public.information_items;

create trigger information_items_enforce_collection_agency
  before insert or update of agency_id, knowledge_collection_id
  on public.information_items
  for each row
  execute function public.enforce_information_collection_agency();

revoke all on function public.enforce_information_collection_agency() from public;
revoke all on function public.enforce_information_collection_agency() from anon;
revoke all on function public.enforce_information_collection_agency() from authenticated;
revoke all on function public.enforce_information_collection_agency() from service_role;

-- RLS: agency-scoped (Knowledge ist gemeinsam)

drop policy if exists information_items_select_own_or_task_linked on public.information_items;
drop policy if exists information_items_insert_own on public.information_items;
drop policy if exists information_items_update_own on public.information_items;
drop policy if exists information_items_delete_own on public.information_items;

create policy information_items_select_agency_member
  on public.information_items
  for select
  to authenticated
  using (public.user_has_active_agency_membership(agency_id));

create policy information_items_insert_agency_member
  on public.information_items
  for insert
  to authenticated
  with check (
    public.user_has_active_agency_membership(agency_id)
    and created_by = (select auth.uid())
    and user_id = (select auth.uid())
  );

create policy information_items_update_agency_member
  on public.information_items
  for update
  to authenticated
  using (public.user_has_active_agency_membership(agency_id))
  with check (public.user_has_active_agency_membership(agency_id));

create policy information_items_delete_agency_member
  on public.information_items
  for delete
  to authenticated
  using (public.user_has_active_agency_membership(agency_id));

-- information_item_files: über agency Membership der Information

drop policy if exists information_item_files_select_own on public.information_item_files;
drop policy if exists information_item_files_insert_own on public.information_item_files;
drop policy if exists information_item_files_delete_own on public.information_item_files;

create policy information_item_files_select_agency_member
  on public.information_item_files
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.information_items as i
      where i.id = information_item_files.information_id
        and public.user_has_active_agency_membership(i.agency_id)
    )
  );

create policy information_item_files_insert_agency_member
  on public.information_item_files
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.information_items as i
      where i.id = information_item_files.information_id
        and public.user_has_active_agency_membership(i.agency_id)
    )
    and exists (
      select 1
      from public.files as f
      where f.id = information_item_files.file_id
        and f.user_id = (select auth.uid())
    )
  );

create policy information_item_files_delete_agency_member
  on public.information_item_files
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.information_items as i
      where i.id = information_item_files.information_id
        and public.user_has_active_agency_membership(i.agency_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 3. case_information_relations (vorbereitet; keine UI)
-- ---------------------------------------------------------------------------

create table public.case_information_relations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete restrict,
  case_id uuid not null references public.cases (id) on delete cascade,
  information_id uuid not null references public.information_items (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint case_information_relations_unique unique (case_id, information_id)
);

comment on table public.case_information_relations is
  'Verknüpfung Cases ↔ Knowledge. Vorbereitet in 30G; UI folgt später. Keine Kopie.';

create index case_information_relations_case_id_idx
  on public.case_information_relations (case_id);

create index case_information_relations_information_id_idx
  on public.case_information_relations (information_id);

create index case_information_relations_agency_id_idx
  on public.case_information_relations (agency_id);

alter table public.case_information_relations enable row level security;

create policy case_information_relations_select_agency_member
  on public.case_information_relations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.cases as c
      where c.id = case_information_relations.case_id
        and c.agency_id = case_information_relations.agency_id
        and public.user_has_active_agency_membership(c.agency_id)
    )
  );

create policy case_information_relations_insert_agency_member
  on public.case_information_relations
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1
      from public.cases as c
      where c.id = case_information_relations.case_id
        and c.agency_id = case_information_relations.agency_id
        and public.user_has_active_agency_membership(c.agency_id)
    )
    and exists (
      select 1
      from public.information_items as i
      where i.id = case_information_relations.information_id
        and i.agency_id = case_information_relations.agency_id
    )
  );

create policy case_information_relations_delete_agency_member
  on public.case_information_relations
  for delete
  to authenticated
  using (
    public.user_has_active_agency_membership(agency_id)
  );

-- ---------------------------------------------------------------------------
-- 4. Task↔Information: Agency-Match statt Eigent-Owner
-- ---------------------------------------------------------------------------

drop policy if exists task_information_relations_insert_agency_member on public.task_information_relations;

create policy task_information_relations_insert_agency_member
  on public.task_information_relations
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1
      from public.tasks as t
      where t.id = task_information_relations.task_id
        and t.agency_id = task_information_relations.agency_id
        and public.user_has_active_agency_membership(t.agency_id)
    )
    and exists (
      select 1
      from public.information_items as i
      where i.id = task_information_relations.information_id
        and i.agency_id = task_information_relations.agency_id
    )
  );

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

  if v_information.agency_id is distinct from v_task.agency_id then
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
  'Verknüpft atomar Knowledge derselben Agentur mit einem Vorgang und erzeugt den Chronikeintrag task.information_linked.';

-- ---------------------------------------------------------------------------
-- 5. knowledge_collections RLS (select-only, wie business_areas)
-- ---------------------------------------------------------------------------

alter table public.knowledge_collections enable row level security;

create policy knowledge_collections_select_agency_member
  on public.knowledge_collections
  for select
  to authenticated
  using (public.user_has_active_agency_membership(agency_id));

-- ---------------------------------------------------------------------------
-- 6. Agency-Bootstrap erweitern
-- ---------------------------------------------------------------------------

create or replace function public.initialize_current_user_account()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_meta jsonb;
  v_first_name text;
  v_last_name text;
  v_agency_name text;
  v_display_name text;
  v_profile_exists boolean;
  v_membership_count integer;
  v_existing_agency_id uuid;
  v_agency_exists boolean;
  v_agency_id uuid;
  v_slug_base text;
  v_slug text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  select u.raw_user_meta_data
  into v_meta
  from auth.users as u
  where u.id = v_user_id;

  if v_meta is null then
    raise exception 'missing user metadata'
      using errcode = 'P0001';
  end if;

  v_first_name := trim(v_meta ->> 'first_name');
  v_last_name := trim(v_meta ->> 'last_name');
  v_agency_name := trim(v_meta ->> 'agency_name');

  if v_first_name is null or v_first_name = '' then
    raise exception 'missing first_name'
      using errcode = 'P0001';
  end if;

  if v_last_name is null or v_last_name = '' then
    raise exception 'missing last_name'
      using errcode = 'P0001';
  end if;

  if v_agency_name is null or v_agency_name = '' then
    raise exception 'missing agency_name'
      using errcode = 'P0001';
  end if;

  select exists (
    select 1
    from public.profiles as p
    where p.id = v_user_id
  )
  into v_profile_exists;

  select count(*)::integer
  into v_membership_count
  from public.agency_memberships as m
  where m.user_id = v_user_id;

  if v_profile_exists and v_membership_count = 1 then
    select m.agency_id
    into v_existing_agency_id
    from public.agency_memberships as m
    where m.user_id = v_user_id;

    select exists (
      select 1
      from public.agencies as a
      where a.id = v_existing_agency_id
    )
    into v_agency_exists;

    if v_agency_exists then
      perform public.seed_default_business_areas_for_agency(v_existing_agency_id);
      perform public.seed_default_workspace_views_for_agency(v_existing_agency_id, v_user_id);
      perform public.seed_default_knowledge_collections_for_agency(v_existing_agency_id);
      return v_existing_agency_id;
    end if;

    raise exception 'inconsistent account bootstrap state'
      using errcode = 'P0001';
  end if;

  if not v_profile_exists and v_membership_count = 0 then
    v_slug_base := lower(
      regexp_replace(v_agency_name, '[^a-zA-Z0-9]+', '-', 'g')
    );
    v_slug_base := trim(both '-' from v_slug_base);

    if v_slug_base = '' then
      raise exception 'invalid agency_name'
        using errcode = 'P0001';
    end if;

    v_slug := v_slug_base || '-' || substr(replace(v_user_id::text, '-', ''), 1, 8);
    v_display_name := v_first_name || ' ' || v_last_name;

    insert into public.profiles (
      id,
      first_name,
      last_name,
      display_name
    )
    values (
      v_user_id,
      v_first_name,
      v_last_name,
      v_display_name
    );

    insert into public.agencies (
      name,
      slug,
      created_by
    )
    values (
      v_agency_name,
      v_slug,
      v_user_id
    )
    returning id into v_agency_id;

    insert into public.agency_memberships (
      agency_id,
      user_id,
      role,
      status
    )
    values (
      v_agency_id,
      v_user_id,
      'owner',
      'active'
    );

    perform public.seed_default_business_areas_for_agency(v_agency_id);
    perform public.seed_default_workspace_views_for_agency(v_agency_id, v_user_id);
    perform public.seed_default_knowledge_collections_for_agency(v_agency_id);

    return v_agency_id;
  end if;

  raise exception 'inconsistent account bootstrap state'
    using errcode = 'P0001';
end;
$$;

comment on function public.initialize_current_user_account() is
  'Legt Profil, Agentur, Owner-Mitgliedschaft, Business-Areas, Workspace-Views und Knowledge-Collections atomar an.';
