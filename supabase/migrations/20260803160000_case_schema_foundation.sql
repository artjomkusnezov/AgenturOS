-- AgenturOS Punkt 30B: Case Schema Foundation und Task→Case Mirror
-- Additiv. tasks bleibt Quelle der Wahrheit. Keine UI-Änderung.

-- ---------------------------------------------------------------------------
-- 1. case_types (globale Systemtypen; agency_id null)
-- ---------------------------------------------------------------------------

create table public.case_types (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies (id) on delete cascade,
  key text not null,
  label text not null,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint case_types_key_not_empty check (trim(key) <> ''),
  constraint case_types_label_not_empty check (trim(label) <> '')
);

comment on table public.case_types is
  'Konfigurierbare Case-Typen. Systemtypen: agency_id IS NULL.';

comment on column public.case_types.agency_id is
  'NULL = globaler Systemtyp. Nicht null = agenturspezifischer Typ (später).';

create unique index case_types_system_key_unique
  on public.case_types (key)
  where agency_id is null;

create unique index case_types_agency_key_unique
  on public.case_types (agency_id, key)
  where agency_id is not null;

create index case_types_agency_id_idx
  on public.case_types (agency_id);

create index case_types_is_active_sort_idx
  on public.case_types (is_active, sort_order);

insert into public.case_types (agency_id, key, label, icon, sort_order, is_active)
values
  (null, 'task', 'Aufgabe', 'tasks', 10, true),
  (null, 'offer', 'Angebot', 'offer', 20, true),
  (null, 'claim', 'Schaden', 'claim', 30, true),
  (null, 'appointment', 'Termin', 'appointment', 40, true),
  (null, 'follow_up', 'Wiedervorlage', 'follow_up', 50, true),
  (null, 'contract', 'Vertrag', 'contract', 60, true),
  (null, 'general', 'Sonstiges', 'general', 70, true);

-- ---------------------------------------------------------------------------
-- 2. business_areas (pro Agency)
-- ---------------------------------------------------------------------------

create table public.business_areas (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  key text not null,
  label text not null,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_areas_key_not_empty check (trim(key) <> ''),
  constraint business_areas_label_not_empty check (trim(label) <> ''),
  constraint business_areas_agency_key_unique unique (agency_id, key)
);

comment on table public.business_areas is
  'Fachbereiche je Agentur. Default-Seed enthält general.';

create index business_areas_agency_id_idx
  on public.business_areas (agency_id);

create index business_areas_agency_active_sort_idx
  on public.business_areas (agency_id, is_active, sort_order);

create or replace function public.seed_default_business_areas_for_agency(
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

  insert into public.business_areas (
    agency_id,
    key,
    label,
    icon,
    sort_order,
    is_active
  )
  select
    p_agency_id,
    v.key,
    v.label,
    v.icon,
    v.sort_order,
    true
  from (
    values
      ('general', 'Allgemein', 'general', 10),
      ('mortgage', 'Baufinanzierung', 'mortgage', 20),
      ('motor', 'Kfz', 'motor', 30),
      ('liability', 'Haftpflicht', 'liability', 40),
      ('property', 'Sach', 'property', 50),
      ('life', 'Leben', 'life', 60),
      ('health', 'Kranken', 'health', 70),
      ('commercial', 'Firmen', 'commercial', 80)
  ) as v(key, label, icon, sort_order)
  on conflict (agency_id, key) do nothing;
end;
$$;

comment on function public.seed_default_business_areas_for_agency(uuid) is
  'Legt die acht Standard-Fachbereiche für eine Agentur idempotent an.';

revoke all on function public.seed_default_business_areas_for_agency(uuid) from public;
revoke all on function public.seed_default_business_areas_for_agency(uuid) from anon;
revoke all on function public.seed_default_business_areas_for_agency(uuid) from authenticated;
revoke all on function public.seed_default_business_areas_for_agency(uuid) from service_role;

-- Seeds für alle bestehenden Agencies

do $$
declare
  r record;
begin
  for r in select id from public.agencies
  loop
    perform public.seed_default_business_areas_for_agency(r.id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. cases
-- ---------------------------------------------------------------------------

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete restrict,
  created_by uuid not null references auth.users (id) on delete restrict,
  assignee_user_id uuid references auth.users (id) on delete set null,
  case_type_id uuid not null references public.case_types (id) on delete restrict,
  business_area_id uuid not null references public.business_areas (id) on delete restrict,
  title text not null,
  description text,
  core_status text not null,
  priority text not null default 'normal',
  due_at date,
  completed_at timestamptz,
  source_task_id uuid references public.tasks (id) on delete cascade,
  source_inbox_item_id uuid references public.inbox_items (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cases_title_not_empty check (trim(title) <> ''),
  constraint cases_core_status_valid check (
    core_status in ('open', 'in_progress', 'waiting', 'completed', 'cancelled')
  ),
  constraint cases_priority_valid check (
    priority in ('low', 'normal', 'high')
  )
);

comment on table public.cases is
  'Agenturweite Vorgänge. Während 30B gespiegelt aus tasks (source_task_id).';

comment on column public.cases.core_status is
  'Technischer Kernstatus: open|in_progress|waiting|completed|cancelled.';

comment on column public.cases.due_at is
  'Fälligkeit/Wiedervorlage als Datum (entspricht tasks.due_date).';

comment on column public.cases.source_task_id is
  '1:1-Spiegel zu tasks während Expand–Contract. Cascade bei Task-Hard-Delete.';

comment on column public.cases.source_inbox_item_id is
  'Optionale Herkunft aus inbox_items (über inbox_relations abgeleitet).';

create unique index cases_source_task_id_unique
  on public.cases (source_task_id)
  where source_task_id is not null;

create index cases_agency_id_idx
  on public.cases (agency_id);

create index cases_case_type_id_idx
  on public.cases (case_type_id);

create index cases_business_area_id_idx
  on public.cases (business_area_id);

create index cases_assignee_user_id_idx
  on public.cases (assignee_user_id);

create index cases_core_status_idx
  on public.cases (core_status);

create index cases_agency_updated_at_idx
  on public.cases (agency_id, updated_at desc);

create index cases_source_inbox_item_id_idx
  on public.cases (source_inbox_item_id);

-- ---------------------------------------------------------------------------
-- 4. Mapping helpers
-- ---------------------------------------------------------------------------

create or replace function public.map_task_to_case_core_status(
  p_completed_at timestamptz
)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    when p_completed_at is null then 'open'
    else 'completed'
  end;
$$;

comment on function public.map_task_to_case_core_status(timestamptz) is
  'Zentrale Abbildung tasks.completed_at → cases.core_status (open|completed).';

revoke all on function public.map_task_to_case_core_status(timestamptz) from public;
revoke all on function public.map_task_to_case_core_status(timestamptz) from anon;
revoke all on function public.map_task_to_case_core_status(timestamptz) from service_role;
grant execute on function public.map_task_to_case_core_status(timestamptz) to authenticated;

create or replace function public.resolve_system_case_type_id(
  p_key text
)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select ct.id
  from public.case_types as ct
  where ct.agency_id is null
    and ct.key = p_key
  limit 1;
$$;

comment on function public.resolve_system_case_type_id(text) is
  'Lädt die ID eines globalen System-Case-Typs anhand des Keys.';

revoke all on function public.resolve_system_case_type_id(text) from public;
revoke all on function public.resolve_system_case_type_id(text) from anon;
revoke all on function public.resolve_system_case_type_id(text) from authenticated;
revoke all on function public.resolve_system_case_type_id(text) from service_role;

create or replace function public.resolve_agency_business_area_id(
  p_agency_id uuid,
  p_key text
)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select ba.id
  from public.business_areas as ba
  where ba.agency_id = p_agency_id
    and ba.key = p_key
  limit 1;
$$;

comment on function public.resolve_agency_business_area_id(uuid, text) is
  'Lädt die Business-Area-ID einer Agentur anhand des Keys.';

revoke all on function public.resolve_agency_business_area_id(uuid, text) from public;
revoke all on function public.resolve_agency_business_area_id(uuid, text) from anon;
revoke all on function public.resolve_agency_business_area_id(uuid, text) from authenticated;
revoke all on function public.resolve_agency_business_area_id(uuid, text) from service_role;

-- ---------------------------------------------------------------------------
-- 5. Mirror function + trigger (tasks → cases, one-way)
-- ---------------------------------------------------------------------------

create or replace function public.sync_case_from_task(
  p_task public.tasks
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_case_type_id uuid;
  v_business_area_id uuid;
  v_inbox_item_id uuid;
  v_core_status text;
  v_updated integer;
begin
  v_case_type_id := public.resolve_system_case_type_id('task');

  if v_case_type_id is null then
    raise exception 'system case type task is missing'
      using errcode = 'P0001';
  end if;

  v_business_area_id := public.resolve_agency_business_area_id(p_task.agency_id, 'general');

  if v_business_area_id is null then
    perform public.seed_default_business_areas_for_agency(p_task.agency_id);
    v_business_area_id := public.resolve_agency_business_area_id(p_task.agency_id, 'general');
  end if;

  if v_business_area_id is null then
    raise exception 'business area general missing for agency %', p_task.agency_id
      using errcode = 'P0001';
  end if;

  v_core_status := public.map_task_to_case_core_status(p_task.completed_at);

  select ir.inbox_item_id
  into v_inbox_item_id
  from public.inbox_relations as ir
  where ir.relation_type = 'task'
    and ir.relation_id = p_task.id
  order by ir.created_at asc, ir.id asc
  limit 1;

  update public.cases as c
  set
    agency_id = p_task.agency_id,
    created_by = p_task.created_by,
    assignee_user_id = p_task.assignee_user_id,
    case_type_id = v_case_type_id,
    business_area_id = v_business_area_id,
    title = p_task.title,
    description = p_task.description,
    core_status = v_core_status,
    priority = p_task.priority,
    due_at = p_task.due_date,
    completed_at = p_task.completed_at,
    source_inbox_item_id = coalesce(c.source_inbox_item_id, v_inbox_item_id),
    updated_at = p_task.updated_at
  where c.source_task_id = p_task.id;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
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
      completed_at,
      source_task_id,
      source_inbox_item_id,
      created_at,
      updated_at
    )
    values (
      p_task.agency_id,
      p_task.created_by,
      p_task.assignee_user_id,
      v_case_type_id,
      v_business_area_id,
      p_task.title,
      p_task.description,
      v_core_status,
      p_task.priority,
      p_task.due_date,
      p_task.completed_at,
      p_task.id,
      v_inbox_item_id,
      p_task.created_at,
      p_task.updated_at
    );
  end if;
end;
$$;

comment on function public.sync_case_from_task(public.tasks) is
  'Spiegelt einen Task verlustfrei in cases. source_inbox_item_id bleibt stabil (erster Ursprung).';

revoke all on function public.sync_case_from_task(public.tasks) from public;
revoke all on function public.sync_case_from_task(public.tasks) from anon;
revoke all on function public.sync_case_from_task(public.tasks) from authenticated;
revoke all on function public.sync_case_from_task(public.tasks) from service_role;

create or replace function public.mirror_task_to_case_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    -- cases.source_task_id ON DELETE CASCADE entfernt den Case.
    return old;
  end if;

  perform public.sync_case_from_task(new);
  return new;
end;
$$;

comment on function public.mirror_task_to_case_trigger() is
  'Einseitiger Mirror tasks → cases bei Insert und Update.';

create trigger tasks_mirror_to_cases
  after insert or update on public.tasks
  for each row
  execute function public.mirror_task_to_case_trigger();

-- Wenn die Inbox-Relation nach dem Task entsteht, Herkunft nachziehen

create or replace function public.mirror_inbox_relation_to_case_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.relation_type = 'task' then
    update public.cases
    set
      source_inbox_item_id = new.inbox_item_id,
      updated_at = now()
    where source_task_id = new.relation_id
      and source_inbox_item_id is null;
  end if;

  return new;
end;
$$;

comment on function public.mirror_inbox_relation_to_case_trigger() is
  'Setzt cases.source_inbox_item_id nur einmal, wenn noch kein Ursprung gesetzt ist.';

create trigger inbox_relations_mirror_to_cases
  after insert on public.inbox_relations
  for each row
  execute function public.mirror_inbox_relation_to_case_trigger();

-- ---------------------------------------------------------------------------
-- 6. Initial backfill aller bestehenden Tasks
-- ---------------------------------------------------------------------------

do $$
declare
  r public.tasks%rowtype;
  v_task_count integer;
  v_case_count integer;
begin
  select count(*)::integer into v_task_count from public.tasks;

  for r in select * from public.tasks
  loop
    perform public.sync_case_from_task(r);
  end loop;

  select count(*)::integer
  into v_case_count
  from public.cases
  where source_task_id is not null;

  if v_task_count <> v_case_count then
    raise exception
      'case backfill aborted: tasks=% mirrored_cases=%',
      v_task_count,
      v_case_count
      using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Account-Bootstrap: Business Areas für neue Agencies
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

    return v_agency_id;
  end if;

  raise exception 'inconsistent account bootstrap state'
    using errcode = 'P0001';
end;
$$;

comment on function public.initialize_current_user_account() is
  'Legt Profil, Agentur, Owner-Mitgliedschaft und Standard-Business-Areas atomar an.';

-- ---------------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------------

alter table public.case_types enable row level security;
alter table public.business_areas enable row level security;
alter table public.cases enable row level security;

-- case_types: lesen globaler Systemtypen + eigener Agency-Typen; kein Client-Write

create policy case_types_select_authenticated
  on public.case_types
  for select
  to authenticated
  using (
    agency_id is null
    or public.user_has_active_agency_membership(agency_id)
  );

-- business_areas: lesen in eigener Agency; kein Client-Write in 30B

create policy business_areas_select_agency_member
  on public.business_areas
  for select
  to authenticated
  using (public.user_has_active_agency_membership(agency_id));

-- cases: agency-scoped lesen; Schreiben erfolgt über Mirror-Trigger (definer)

create policy cases_select_agency_member
  on public.cases
  for select
  to authenticated
  using (public.user_has_active_agency_membership(agency_id));
