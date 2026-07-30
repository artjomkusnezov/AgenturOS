-- AgenturOS: Inbox-Dateianhänge für Universal Capture

create table public.inbox_item_files (
  id uuid primary key default gen_random_uuid(),
  inbox_item_id uuid not null references public.inbox_items (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint inbox_item_files_unique unique (inbox_item_id, file_id)
);

comment on table public.inbox_item_files is 'Verknüpfung zwischen Eingangseinträgen und hochgeladenen Dateien.';

create index inbox_item_files_inbox_item_id_idx
  on public.inbox_item_files (inbox_item_id);

create index inbox_item_files_file_id_idx
  on public.inbox_item_files (file_id);

alter table public.inbox_item_files enable row level security;

create policy inbox_item_files_select_own
  on public.inbox_item_files
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.inbox_items
      where inbox_items.id = inbox_item_files.inbox_item_id
        and inbox_items.user_id = (select auth.uid())
    )
  );

create policy inbox_item_files_insert_own
  on public.inbox_item_files
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.inbox_items
      where inbox_items.id = inbox_item_files.inbox_item_id
        and inbox_items.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.files
      where files.id = inbox_item_files.file_id
        and files.user_id = (select auth.uid())
    )
  );

create policy inbox_item_files_delete_own
  on public.inbox_item_files
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.inbox_items
      where inbox_items.id = inbox_item_files.inbox_item_id
        and inbox_items.user_id = (select auth.uid())
    )
  );

alter table public.inbox_items drop constraint inbox_items_source_valid;

alter table public.inbox_items
  add constraint inbox_items_source_valid
  check (source in ('manual_text', 'universal_capture'));

comment on column public.inbox_items.source is 'Quelle der Erfassung; manual_text oder universal_capture.';
