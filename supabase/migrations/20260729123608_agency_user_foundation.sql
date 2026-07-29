-- AgenturOS: Benutzer-, Agentur- und Mitgliedschaftsfundament

-- Enums

create type public.agency_status as enum (
  'active',
  'suspended',
  'archived'
);

comment on type public.agency_status is 'Lebenszyklusstatus einer Agentur.';

create type public.membership_role as enum (
  'owner',
  'member'
);

comment on type public.membership_role is 'Rolle eines Benutzers innerhalb einer Agentur.';

create type public.membership_status as enum (
  'active',
  'suspended',
  'removed'
);

comment on type public.membership_status is 'Mitgliedschaftsstatus innerhalb einer Agentur.';

-- Tables

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  display_name text,
  locale text not null default 'de-DE',
  timezone text not null default 'Europe/Berlin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Erweitertes Benutzerprofil, verknüpft mit auth.users.';

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.agency_status not null default 'active',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agencies_name_not_empty check (trim(name) <> ''),
  constraint agencies_slug_not_empty check (trim(slug) <> '')
);

comment on table public.agencies is 'Agentur als Mandantencontainer.';

create table public.agency_memberships (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.membership_role not null default 'member',
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  suspended_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_memberships_agency_user_unique unique (agency_id, user_id),
  constraint agency_memberships_suspended_at_required check (
    (
      status = 'suspended'
      and suspended_at is not null
    )
    or status <> 'suspended'
  ),
  constraint agency_memberships_removed_at_required check (
    (
      status = 'removed'
      and removed_at is not null
    )
    or status <> 'removed'
  ),
  constraint agency_memberships_active_timestamps_null check (
    (
      status = 'active'
      and suspended_at is null
      and removed_at is null
    )
    or status <> 'active'
  )
);

comment on table public.agency_memberships is 'Benutzermitgliedschaft in einer Agentur mit Rolle und Status.';

-- Indexes

create index agency_memberships_user_id_idx
  on public.agency_memberships (user_id);

create index agency_memberships_agency_id_idx
  on public.agency_memberships (agency_id);

create index agency_memberships_agency_id_status_idx
  on public.agency_memberships (agency_id, status);

create index agency_memberships_user_id_status_idx
  on public.agency_memberships (user_id, status);

-- updated_at trigger function

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at_timestamp() is
  'Setzt updated_at bei Zeilenaktualisierung auf now(). Wird von Before-Update-Triggern verwendet.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at_timestamp();

create trigger agencies_set_updated_at
  before update on public.agencies
  for each row
  execute function public.set_updated_at_timestamp();

create trigger agency_memberships_set_updated_at
  before update on public.agency_memberships
  for each row
  execute function public.set_updated_at_timestamp();

-- Row Level Security

alter table public.profiles enable row level security;
alter table public.agencies enable row level security;
alter table public.agency_memberships enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
