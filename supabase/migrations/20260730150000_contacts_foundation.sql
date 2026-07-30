-- AgenturOS: Kontaktfundament

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  company text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_identity_present check (
    trim(coalesce(first_name, '')) <> ''
    or trim(coalesce(last_name, '')) <> ''
    or trim(coalesce(company, '')) <> ''
  )
);

comment on table public.contacts is 'Benutzerbezogene Kontakte mit Name, Firma und Kontaktdaten.';
comment on column public.contacts.first_name is 'Optionaler Vorname des Kontakts.';
comment on column public.contacts.last_name is 'Optionaler Nachname des Kontakts.';
comment on column public.contacts.company is 'Optionale Firma des Kontakts.';
comment on column public.contacts.email is 'Optionale E-Mail-Adresse des Kontakts.';
comment on column public.contacts.phone is 'Optionale Telefonnummer des Kontakts.';
comment on column public.contacts.notes is 'Optionale Notizen zum Kontakt.';

create index contacts_user_id_idx
  on public.contacts (user_id);

create index contacts_user_id_updated_at_idx
  on public.contacts (user_id, updated_at desc);

alter table public.contacts enable row level security;

create policy contacts_select_own
  on public.contacts
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy contacts_insert_own
  on public.contacts
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy contacts_update_own
  on public.contacts
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy contacts_delete_own
  on public.contacts
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
