-- AgenturOS Punkt 24F.1: Agenturweiter Lesezugriff auf verknüpfte Dateien und Informationen

-- files: Eigentümer-Lesezugriff bleibt; zusätzlich lesbar über Task-Verknüpfung derselben Agentur

drop policy if exists files_select_own on public.files;

create policy files_select_own_or_task_linked
  on public.files
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.task_file_relations as relation
      inner join public.tasks as task on task.id = relation.task_id
      where relation.file_id = files.id
        and relation.agency_id = task.agency_id
        and public.user_has_active_agency_membership(task.agency_id)
    )
  );

comment on policy files_select_own_or_task_linked on public.files is
  'Eigentümer oder aktives Agenturmitglied bei verknüpftem Vorgang.';

-- information_items: Eigentümer-Lesezugriff bleibt; zusätzlich lesbar über Task-Verknüpfung

drop policy if exists information_items_select_own on public.information_items;

create policy information_items_select_own_or_task_linked
  on public.information_items
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.task_information_relations as relation
      inner join public.tasks as task on task.id = relation.task_id
      where relation.information_id = information_items.id
        and relation.agency_id = task.agency_id
        and public.user_has_active_agency_membership(task.agency_id)
    )
  );

comment on policy information_items_select_own_or_task_linked on public.information_items is
  'Eigentümer oder aktives Agenturmitglied bei verknüpftem Vorgang.';

-- storage.objects: zusätzlicher Lesezugriff für verknüpfte Dateien (Bucket bleibt privat)

create policy user_files_storage_select_task_linked
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'user-files'
    and exists (
      select 1
      from public.files as f
      inner join public.task_file_relations as relation on relation.file_id = f.id
      inner join public.tasks as task on task.id = relation.task_id
      where f.storage_path = storage.objects.name
        and relation.agency_id = task.agency_id
        and public.user_has_active_agency_membership(task.agency_id)
    )
  );

comment on policy user_files_storage_select_task_linked on storage.objects is
  'Agenturmitglieder dürfen Storage-Objekte lesen, die über einen sichtbaren Vorgang verknüpft sind.';

-- Relationstabellen: SELECT an sichtbaren Task koppeln (Schutz vor ID-Offenlegung)

drop policy if exists task_file_relations_select_agency_member on public.task_file_relations;

create policy task_file_relations_select_agency_member
  on public.task_file_relations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tasks as task
      where task.id = task_file_relations.task_id
        and task.agency_id = task_file_relations.agency_id
        and public.user_has_active_agency_membership(task.agency_id)
    )
  );

drop policy if exists task_information_relations_select_agency_member on public.task_information_relations;

create policy task_information_relations_select_agency_member
  on public.task_information_relations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tasks as task
      where task.id = task_information_relations.task_id
        and task.agency_id = task_information_relations.agency_id
        and public.user_has_active_agency_membership(task.agency_id)
    )
  );
