-- AgenturOS Punkt 31E.1: Vorgangsverlauf Foundation (append-only)

create table public.case_timeline_entries (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete restrict,
  created_by uuid not null references auth.users (id) on delete restrict,
  event_type text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint case_timeline_entries_event_type_valid check (
    event_type in ('created', 'note')
  ),
  constraint case_timeline_entries_content_not_empty check (
    trim(content) <> ''
  )
);

comment on table public.case_timeline_entries is
  'Gemeinsamer Vorgangsverlauf für alle Case-Typen; append-only.';

comment on column public.case_timeline_entries.event_type is
  'Ereignistyp V1: created (automatisch) oder note (manuell).';

comment on column public.case_timeline_entries.created_by is
  'Autor; bei created der Case-Ersteller.';

comment on column public.case_timeline_entries.content is
  'Anzeigetext des Verlaufseintrags.';

create index case_timeline_entries_case_id_created_at_idx
  on public.case_timeline_entries (case_id, created_at);

create index case_timeline_entries_agency_id_created_at_idx
  on public.case_timeline_entries (agency_id, created_at);

alter table public.case_timeline_entries enable row level security;

create policy case_timeline_entries_select_agency_member
  on public.case_timeline_entries
  for select
  to authenticated
  using (public.user_has_active_agency_membership(agency_id));

create policy case_timeline_entries_insert_note
  on public.case_timeline_entries
  for insert
  to authenticated
  with check (
    event_type = 'note'
    and created_by = (select auth.uid())
    and trim(content) <> ''
    and public.user_has_active_agency_membership(agency_id)
    and exists (
      select 1
      from public.cases as c
      where c.id = case_timeline_entries.case_id
        and c.agency_id = case_timeline_entries.agency_id
        and public.user_has_active_agency_membership(c.agency_id)
    )
  );

-- Automatisches Created-Ereignis bei neuem Case
create or replace function public.insert_case_created_timeline_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.case_timeline_entries (
    case_id,
    agency_id,
    created_by,
    event_type,
    content,
    created_at
  )
  values (
    new.id,
    new.agency_id,
    new.created_by,
    'created',
    'Vorgang erstellt',
    new.created_at
  );

  return new;
end;
$$;

comment on function public.insert_case_created_timeline_entry() is
  'Erzeugt bei Case-Anlage den Verlaufseintrag event_type=created.';

revoke all on function public.insert_case_created_timeline_entry() from public;
revoke all on function public.insert_case_created_timeline_entry() from anon;
revoke all on function public.insert_case_created_timeline_entry() from authenticated;
revoke all on function public.insert_case_created_timeline_entry() from service_role;

drop trigger if exists cases_insert_created_timeline on public.cases;

create trigger cases_insert_created_timeline
  after insert on public.cases
  for each row
  execute function public.insert_case_created_timeline_entry();

-- Bestehende Cases: einmalig Created-Einträge nachziehen
insert into public.case_timeline_entries (
  case_id,
  agency_id,
  created_by,
  event_type,
  content,
  created_at
)
select
  c.id,
  c.agency_id,
  c.created_by,
  'created',
  'Vorgang erstellt',
  c.created_at
from public.cases as c
where not exists (
  select 1
  from public.case_timeline_entries as e
  where e.case_id = c.id
    and e.event_type = 'created'
);
