-- AgenturOS Punkt 24F: Vorgänge mit Dateien und Informationen verknüpfen

create table public.task_file_relations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete restrict,
  task_id uuid not null references public.tasks (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint task_file_relations_unique unique (task_id, file_id)
);

comment on table public.task_file_relations is
  'Verknüpfung zwischen Vorgängen und Dateien; keine Kopie der Datei.';

create index task_file_relations_task_id_idx
  on public.task_file_relations (task_id);

create index task_file_relations_file_id_idx
  on public.task_file_relations (file_id);

create index task_file_relations_agency_id_idx
  on public.task_file_relations (agency_id);

alter table public.task_file_relations enable row level security;

create policy task_file_relations_select_agency_member
  on public.task_file_relations
  for select
  to authenticated
  using (
    public.user_has_active_agency_membership(agency_id)
  );

create policy task_file_relations_insert_agency_member
  on public.task_file_relations
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1
      from public.tasks as t
      where t.id = task_file_relations.task_id
        and t.agency_id = task_file_relations.agency_id
        and public.user_has_active_agency_membership(t.agency_id)
    )
    and exists (
      select 1
      from public.files as f
      where f.id = task_file_relations.file_id
        and f.user_id = (select auth.uid())
    )
  );

create policy task_file_relations_delete_agency_member
  on public.task_file_relations
  for delete
  to authenticated
  using (
    public.user_has_active_agency_membership(agency_id)
  );

create table public.task_information_relations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete restrict,
  task_id uuid not null references public.tasks (id) on delete cascade,
  information_id uuid not null references public.information_items (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint task_information_relations_unique unique (task_id, information_id)
);

comment on table public.task_information_relations is
  'Verknüpfung zwischen Vorgängen und Informationen; keine Kopie der Information.';

create index task_information_relations_task_id_idx
  on public.task_information_relations (task_id);

create index task_information_relations_information_id_idx
  on public.task_information_relations (information_id);

create index task_information_relations_agency_id_idx
  on public.task_information_relations (agency_id);

alter table public.task_information_relations enable row level security;

create policy task_information_relations_select_agency_member
  on public.task_information_relations
  for select
  to authenticated
  using (
    public.user_has_active_agency_membership(agency_id)
  );

create policy task_information_relations_insert_agency_member
  on public.task_information_relations
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1
      from public.tasks as t
      where t.id = task_information_relations.task_id
        and t.agency_id = task_information_relations.agency_id
        and public.user_has_active_agency_membership(t.agency_id)
    )
    and exists (
      select 1
      from public.information_items as i
      where i.id = task_information_relations.information_id
        and i.user_id = (select auth.uid())
    )
  );

create policy task_information_relations_delete_agency_member
  on public.task_information_relations
  for delete
  to authenticated
  using (
    public.user_has_active_agency_membership(agency_id)
  );
