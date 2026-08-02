-- AgenturOS Punkt 29A: Information ↔ Datei (Document Foundation)

create table public.information_item_files (
  id uuid primary key default gen_random_uuid(),
  information_id uuid not null references public.information_items (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint information_item_files_unique unique (information_id, file_id)
);

comment on table public.information_item_files is
  'Verknüpfung zwischen Informationen und Dateianhängen.';
comment on column public.information_item_files.display_order is
  'Reihenfolge der Anhänge innerhalb einer Information.';

create index information_item_files_information_id_idx
  on public.information_item_files (information_id);

create index information_item_files_file_id_idx
  on public.information_item_files (file_id);

create index information_item_files_information_id_display_order_idx
  on public.information_item_files (information_id, display_order);

alter table public.information_item_files enable row level security;

create policy information_item_files_select_own
  on public.information_item_files
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.information_items
      where information_items.id = information_item_files.information_id
        and information_items.user_id = (select auth.uid())
    )
  );

create policy information_item_files_insert_own
  on public.information_item_files
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.information_items
      where information_items.id = information_item_files.information_id
        and information_items.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.files
      where files.id = information_item_files.file_id
        and files.user_id = (select auth.uid())
    )
  );

create policy information_item_files_delete_own
  on public.information_item_files
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.information_items
      where information_items.id = information_item_files.information_id
        and information_items.user_id = (select auth.uid())
    )
  );
