-- AgenturOS Punkt 30F: Konfigurierbare Workspace Views
-- Additiv. Keine Änderung an cases/tasks/Mirror.

-- ---------------------------------------------------------------------------
-- 1. workspace_views
-- ---------------------------------------------------------------------------

create table public.workspace_views (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  key text not null,
  name text not null,
  icon text,
  scope text not null default 'cases',
  filters jsonb not null default '{}'::jsonb,
  sort text not null default 'updated_at_desc',
  visible_in_navigation boolean not null default true,
  visible_on_dashboard boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_views_key_not_empty check (trim(key) <> ''),
  constraint workspace_views_name_not_empty check (trim(name) <> ''),
  constraint workspace_views_scope_cases check (scope = 'cases'),
  constraint workspace_views_sort_allowed check (
    sort in (
      'updated_at_desc',
      'created_at_desc',
      'due_at_asc',
      'priority_desc'
    )
  )
);

comment on table public.workspace_views is
  'Agenturweite gespeicherte Case-Ansichten für Navigation, Workspace und Dashboard.';

comment on column public.workspace_views.filters is
  'Kontrollierte Filterstruktur (JSON). Keine SQL-Fragmente.';

comment on column public.workspace_views.sort is
  'Kontrollierte Sortieroption. Keine freien Spaltennamen.';

create unique index workspace_views_agency_key_unique
  on public.workspace_views (agency_id, key);

create index workspace_views_agency_active_nav_idx
  on public.workspace_views (agency_id, is_active, visible_in_navigation, sort_order);

create index workspace_views_agency_active_dashboard_idx
  on public.workspace_views (agency_id, is_active, visible_on_dashboard, sort_order);

-- ---------------------------------------------------------------------------
-- 2. Seed-Funktion (idempotent, keine Label-/Icon-Überschreibung)
-- ---------------------------------------------------------------------------

create or replace function public.seed_default_workspace_views_for_agency(
  p_agency_id uuid,
  p_created_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_created_by uuid;
begin
  if p_agency_id is null then
    raise exception 'agency_id is required'
      using errcode = 'P0001';
  end if;

  v_created_by := p_created_by;

  if v_created_by is null then
    select a.created_by
    into v_created_by
    from public.agencies as a
    where a.id = p_agency_id;
  end if;

  if v_created_by is null then
    select m.user_id
    into v_created_by
    from public.agency_memberships as m
    where m.agency_id = p_agency_id
      and m.status = 'active'
    order by
      case when m.role = 'owner' then 0 else 1 end,
      m.created_at asc
    limit 1;
  end if;

  if v_created_by is null then
    raise exception 'created_by could not be resolved for agency %', p_agency_id
      using errcode = 'P0001';
  end if;

  insert into public.workspace_views (
    agency_id,
    key,
    name,
    icon,
    scope,
    filters,
    sort,
    visible_in_navigation,
    visible_on_dashboard,
    sort_order,
    is_active,
    created_by
  )
  select
    p_agency_id,
    v.key,
    v.name,
    v.icon,
    'cases',
    v.filters::jsonb,
    'updated_at_desc',
    v.visible_in_navigation,
    v.visible_on_dashboard,
    v.sort_order,
    true,
    v_created_by
  from (
    values
      (
        'tasks',
        'Aufgaben',
        'tasks',
        '{"case_type_keys":["task"],"core_statuses":["open","in_progress","waiting"]}',
        true,
        true,
        10
      ),
      (
        'offers',
        'Angebote',
        'offer',
        '{"case_type_keys":["offer"],"core_statuses":["open","in_progress","waiting"]}',
        true,
        true,
        20
      ),
      (
        'claims',
        'Schäden',
        'claim',
        '{"case_type_keys":["claim"],"core_statuses":["open","in_progress","waiting"]}',
        true,
        true,
        30
      ),
      (
        'follow-ups',
        'Wiedervorlagen',
        'follow_up',
        '{"case_type_keys":["follow_up"],"core_statuses":["open","in_progress","waiting"]}',
        true,
        true,
        40
      ),
      (
        'mortgage',
        'Baufinanzierungen',
        'mortgage',
        '{"business_area_keys":["mortgage"],"core_statuses":["open","in_progress","waiting"]}',
        true,
        false,
        50
      )
  ) as v(
    key,
    name,
    icon,
    filters,
    visible_in_navigation,
    visible_on_dashboard,
    sort_order
  )
  on conflict (agency_id, key) do nothing;
end;
$$;

comment on function public.seed_default_workspace_views_for_agency(uuid, uuid) is
  'Legt Standard-Case-Views für eine Agentur idempotent an (ohne bestehende zu überschreiben).';

revoke all on function public.seed_default_workspace_views_for_agency(uuid, uuid) from public;
revoke all on function public.seed_default_workspace_views_for_agency(uuid, uuid) from anon;
revoke all on function public.seed_default_workspace_views_for_agency(uuid, uuid) from authenticated;
revoke all on function public.seed_default_workspace_views_for_agency(uuid, uuid) from service_role;

-- Seeds für alle bestehenden Agencies

do $$
declare
  r record;
begin
  for r in select id from public.agencies
  loop
    perform public.seed_default_workspace_views_for_agency(r.id, null);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Agency-Bootstrap erweitern
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

    return v_agency_id;
  end if;

  raise exception 'inconsistent account bootstrap state'
    using errcode = 'P0001';
end;
$$;

comment on function public.initialize_current_user_account() is
  'Legt Profil, Agentur, Owner-Mitgliedschaft, Business-Areas und Workspace-Views atomar an.';

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

alter table public.workspace_views enable row level security;

create policy workspace_views_select_agency_member
  on public.workspace_views
  for select
  to authenticated
  using (public.user_has_active_agency_membership(agency_id));

create policy workspace_views_insert_agency_member
  on public.workspace_views
  for insert
  to authenticated
  with check (
    public.user_has_active_agency_membership(agency_id)
    and created_by = auth.uid()
  );

create policy workspace_views_update_agency_member
  on public.workspace_views
  for update
  to authenticated
  using (public.user_has_active_agency_membership(agency_id))
  with check (public.user_has_active_agency_membership(agency_id));
