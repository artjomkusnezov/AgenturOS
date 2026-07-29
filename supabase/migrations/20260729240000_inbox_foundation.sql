-- AgenturOS: Zentraler Eingang – Capture Foundation

create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  source text not null default 'manual_text',
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inbox_items_content_not_empty check (trim(content) <> ''),
  constraint inbox_items_source_valid check (source in ('manual_text'))
);

comment on table public.inbox_items is 'Benutzerbezogenes Eingangselement für zentrale Inhaltserfassung.';
comment on column public.inbox_items.content is 'Erfasster Inhalt des Eingangselements.';
comment on column public.inbox_items.source is 'Quelle der Erfassung; in Punkt 15 ausschließlich manual_text.';
comment on column public.inbox_items.processed_at is 'Zeitpunkt der Bearbeitung; null bedeutet unbearbeitet.';

create index inbox_items_user_id_idx
  on public.inbox_items (user_id);

create index inbox_items_user_id_created_at_idx
  on public.inbox_items (user_id, created_at desc);

alter table public.inbox_items enable row level security;

create policy inbox_items_select_own
  on public.inbox_items
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy inbox_items_insert_own
  on public.inbox_items
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy inbox_items_update_own
  on public.inbox_items
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy inbox_items_delete_own
  on public.inbox_items
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
