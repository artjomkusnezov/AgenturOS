-- AgenturOS: Aufgabenfundament

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_not_empty check (trim(title) <> '')
);

comment on table public.tasks is 'Benutzerbezogene Aufgabe mit Titel und optionaler Beschreibung.';

create index tasks_user_id_idx
  on public.tasks (user_id);

create index tasks_user_id_updated_at_idx
  on public.tasks (user_id, updated_at desc);

alter table public.tasks enable row level security;

create policy tasks_select_own
  on public.tasks
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy tasks_insert_own
  on public.tasks
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy tasks_update_own
  on public.tasks
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy tasks_delete_own
  on public.tasks
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
