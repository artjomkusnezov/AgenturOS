-- AgenturOS Punkt 31A.2: Fix RLS recursion on files ↔ inbox_item_files
-- Additive. Keine UI. Keine Schema-Erweiterung außer Helper + Policy.

-- ---------------------------------------------------------------------------
-- 1. Sichere Case-Origin-Prüfung (SECURITY DEFINER, nur boolean)
-- ---------------------------------------------------------------------------

create or replace function public.user_can_access_file_via_case_origin(
  p_file_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if p_file_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.inbox_item_files as iif
    inner join public.cases as c
      on c.source_inbox_item_id = iif.inbox_item_id
    where iif.file_id = p_file_id
      and public.user_has_active_agency_membership(c.agency_id)
  );
end;
$$;

comment on function public.user_can_access_file_via_case_origin(uuid) is
  'True, wenn die Datei über inbox_item_files an den Case-Ursprung einer Agency gebunden ist, in der der aktuelle Nutzer aktives Mitglied ist. SECURITY DEFINER bricht die RLS-Rekursion files ↔ inbox_item_files.';

revoke all on function public.user_can_access_file_via_case_origin(uuid) from public;
revoke all on function public.user_can_access_file_via_case_origin(uuid) from anon;
revoke all on function public.user_can_access_file_via_case_origin(uuid) from service_role;
grant execute on function public.user_can_access_file_via_case_origin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. files SELECT: Case-Origin über Helper statt direktem Join
-- ---------------------------------------------------------------------------

drop policy if exists files_select_own_or_task_or_case_origin on public.files;

create policy files_select_own_or_task_or_case_origin
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
    or public.user_can_access_file_via_case_origin(files.id)
  );

comment on policy files_select_own_or_task_or_case_origin on public.files is
  'Eigentümer, Task-Verknüpfung oder Case-Ursprung (Helper, ohne RLS-Rekursion).';

-- ---------------------------------------------------------------------------
-- 3. Storage SELECT: dieselbe Helper-Prüfung
-- ---------------------------------------------------------------------------

drop policy if exists user_files_storage_select_case_origin on storage.objects;

create policy user_files_storage_select_case_origin
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'user-files'
    and exists (
      select 1
      from public.files as f
      where f.storage_path = storage.objects.name
        and public.user_can_access_file_via_case_origin(f.id)
    )
  );

comment on policy user_files_storage_select_case_origin on storage.objects is
  'Agenturmitglieder dürfen Storage-Objekte lesen, die über Case-Ursprung freigegeben sind (Helper).';
