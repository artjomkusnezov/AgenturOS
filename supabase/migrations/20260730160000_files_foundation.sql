-- AgenturOS: Dateienfundament

create table public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint files_filename_not_empty check (trim(filename) <> ''),
  constraint files_storage_path_not_empty check (trim(storage_path) <> ''),
  constraint files_mime_type_not_empty check (trim(mime_type) <> ''),
  constraint files_size_bytes_not_negative check (size_bytes >= 0)
);

comment on table public.files is 'Benutzerbezogene Dateimetadaten mit Verweis auf Supabase Storage.';
comment on column public.files.filename is 'Ursprünglicher Dateiname zur Anzeige.';
comment on column public.files.storage_path is 'Benutzerspezifischer Pfad im Storage-Bucket.';
comment on column public.files.mime_type is 'MIME-Type der Datei.';
comment on column public.files.size_bytes is 'Dateigröße in Bytes.';

create index files_user_id_idx
  on public.files (user_id);

create index files_user_id_updated_at_idx
  on public.files (user_id, updated_at desc);

alter table public.files enable row level security;

create policy files_select_own
  on public.files
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy files_insert_own
  on public.files
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy files_update_own
  on public.files
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy files_delete_own
  on public.files
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit)
values ('user-files', 'user-files', false, 52428800);

create policy user_files_storage_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy user_files_storage_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy user_files_storage_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
