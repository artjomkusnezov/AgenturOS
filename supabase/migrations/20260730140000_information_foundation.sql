-- AgenturOS: Informationsfundament

create table public.information_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint information_items_title_not_empty check (trim(title) <> '')
);

comment on table public.information_items is 'Benutzerbezogenes dauerhaftes Wissen mit Titel und Inhalt.';
comment on column public.information_items.title is 'Titel der Information.';
comment on column public.information_items.content is 'Optionaler Inhalt der Information.';

create index information_items_user_id_idx
  on public.information_items (user_id);

create index information_items_user_id_updated_at_idx
  on public.information_items (user_id, updated_at desc);

alter table public.information_items enable row level security;

create policy information_items_select_own
  on public.information_items
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy information_items_insert_own
  on public.information_items
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy information_items_update_own
  on public.information_items
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy information_items_delete_own
  on public.information_items
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
