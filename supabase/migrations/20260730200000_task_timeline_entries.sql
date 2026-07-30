-- AgenturOS Punkt 24C: Arbeitschronik-Datenmodell (append-only)

create table public.task_timeline_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  entry_type text not null,
  event_key text,
  author_user_id uuid not null references auth.users (id) on delete restrict,
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint task_timeline_entries_entry_type_valid check (
    entry_type in ('note', 'system')
  ),
  constraint task_timeline_entries_content_not_empty check (
    trim(content) <> ''
  ),
  constraint task_timeline_entries_type_event_key_valid check (
    (
      entry_type = 'note'
      and event_key is null
    )
    or (
      entry_type = 'system'
      and event_key is not null
      and trim(event_key) <> ''
    )
  )
);

comment on table public.task_timeline_entries is
  'Lineare Arbeitschronik eines Vorgangs; append-only.';

comment on column public.task_timeline_entries.entry_type is
  'Art des Eintrags: note (manuell) oder system (automatisch).';

comment on column public.task_timeline_entries.event_key is
  'Maschinenlesbarer Schlüssel für Systemereignisse; bei Notizen null.';

comment on column public.task_timeline_entries.author_user_id is
  'Autor des Eintrags; bei Systemereignissen der auslösende Benutzer.';

comment on column public.task_timeline_entries.content is
  'Anzeigetext des Chronikeintrags.';

comment on column public.task_timeline_entries.metadata is
  'Optionale maschinenlesbare Zusatzinformationen ohne festes Schema.';

create index task_timeline_entries_task_id_created_at_idx
  on public.task_timeline_entries (task_id, created_at);

alter table public.task_timeline_entries enable row level security;

create policy task_timeline_entries_select_agency_member
  on public.task_timeline_entries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tasks as t
      where t.id = task_timeline_entries.task_id
        and public.user_has_active_agency_membership(t.agency_id)
    )
  );

create policy task_timeline_entries_insert_note
  on public.task_timeline_entries
  for insert
  to authenticated
  with check (
    entry_type = 'note'
    and event_key is null
    and author_user_id = (select auth.uid())
    and trim(content) <> ''
    and exists (
      select 1
      from public.tasks as t
      where t.id = task_timeline_entries.task_id
        and public.user_has_active_agency_membership(t.agency_id)
    )
  );
