-- AgenturOS Punkt 34A.0b: Shared Agency Foundation
-- Gemeinsame Agentur-Inbox: agency_id als Sichtbarkeitsgrenze,
-- user_id bleibt Ersteller (Audit).

-- ---------------------------------------------------------------------------
-- 1. Spalte agency_id
-- ---------------------------------------------------------------------------

alter table public.inbox_items
  add column agency_id uuid null references public.agencies (id);

comment on column public.inbox_items.agency_id is
  'Agentur, zu deren gemeinsamem Eingang dieses Element gehört.';
comment on column public.inbox_items.user_id is
  'Ersteller des Eingangselements (Audit); Sichtbarkeit über agency_id.';

-- ---------------------------------------------------------------------------
-- 2. Backfill aus aktiver Membership des Erstellers
-- ---------------------------------------------------------------------------

update public.inbox_items as i
set agency_id = sub.agency_id
from (
  select distinct on (m.user_id)
    m.user_id,
    m.agency_id
  from public.agency_memberships as m
  where m.status = 'active'::public.membership_status
  order by m.user_id, m.joined_at asc nulls last, m.created_at asc
) as sub
where i.user_id = sub.user_id
  and i.agency_id is null;

do $$
declare
  v_orphan_count integer;
begin
  select count(*)::integer
  into v_orphan_count
  from public.inbox_items
  where agency_id is null;

  if v_orphan_count > 0 then
    raise exception
      'inbox_items backfill failed: % row(s) without active agency membership',
      v_orphan_count
      using errcode = 'P0001';
  end if;
end;
$$;

alter table public.inbox_items
  alter column agency_id set not null;

create index inbox_items_agency_id_idx
  on public.inbox_items (agency_id);

create index inbox_items_agency_id_created_at_idx
  on public.inbox_items (agency_id, created_at desc);

create index inbox_items_agency_id_transcription_status_idx
  on public.inbox_items (agency_id, transcription_status);

-- ---------------------------------------------------------------------------
-- 3. RLS inbox_items — Agency-Mitglieder lesen/schreiben/löschen
-- ---------------------------------------------------------------------------

drop policy if exists inbox_items_select_own_or_case_origin on public.inbox_items;
drop policy if exists inbox_items_select_own on public.inbox_items;
drop policy if exists inbox_items_insert_own on public.inbox_items;
drop policy if exists inbox_items_update_own on public.inbox_items;
drop policy if exists inbox_items_delete_own on public.inbox_items;

create policy inbox_items_select_agency
  on public.inbox_items
  for select
  to authenticated
  using (public.user_has_active_agency_membership(agency_id));

create policy inbox_items_insert_agency
  on public.inbox_items
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.user_has_active_agency_membership(agency_id)
  );

create policy inbox_items_update_agency
  on public.inbox_items
  for update
  to authenticated
  using (public.user_has_active_agency_membership(agency_id))
  with check (public.user_has_active_agency_membership(agency_id));

create policy inbox_items_delete_agency
  on public.inbox_items
  for delete
  to authenticated
  using (public.user_has_active_agency_membership(agency_id));

comment on policy inbox_items_select_agency on public.inbox_items is
  'Aktive Agenturmitglieder dürfen Eingänge der eigenen Agentur lesen.';
comment on policy inbox_items_insert_agency on public.inbox_items is
  'Insert nur als eigener user_id in eine Agentur mit aktiver Membership.';
comment on policy inbox_items_update_agency on public.inbox_items is
  'Aktive Agenturmitglieder dürfen Eingänge der eigenen Agentur bearbeiten.';
comment on policy inbox_items_delete_agency on public.inbox_items is
  'Aktive Agenturmitglieder dürfen Eingänge der eigenen Agentur löschen.';

-- ---------------------------------------------------------------------------
-- 4. RLS inbox_item_files — über Inbox-Agency
-- ---------------------------------------------------------------------------

drop policy if exists inbox_item_files_select_own_or_case_origin on public.inbox_item_files;
drop policy if exists inbox_item_files_select_own on public.inbox_item_files;
drop policy if exists inbox_item_files_insert_own on public.inbox_item_files;
drop policy if exists inbox_item_files_delete_own on public.inbox_item_files;

create policy inbox_item_files_select_agency
  on public.inbox_item_files
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.inbox_items as i
      where i.id = inbox_item_files.inbox_item_id
        and public.user_has_active_agency_membership(i.agency_id)
    )
  );

create policy inbox_item_files_insert_agency
  on public.inbox_item_files
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.inbox_items as i
      where i.id = inbox_item_files.inbox_item_id
        and public.user_has_active_agency_membership(i.agency_id)
    )
    and exists (
      select 1
      from public.files as f
      where f.id = inbox_item_files.file_id
        and f.user_id = (select auth.uid())
    )
  );

create policy inbox_item_files_delete_agency
  on public.inbox_item_files
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.inbox_items as i
      where i.id = inbox_item_files.inbox_item_id
        and public.user_has_active_agency_membership(i.agency_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 5. RLS inbox_relations — über Inbox-Agency
-- ---------------------------------------------------------------------------

drop policy if exists inbox_relations_select_own on public.inbox_relations;
drop policy if exists inbox_relations_insert_own on public.inbox_relations;

create policy inbox_relations_select_agency
  on public.inbox_relations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.inbox_items as i
      where i.id = inbox_relations.inbox_item_id
        and public.user_has_active_agency_membership(i.agency_id)
    )
  );

-- Inserts laufen typischerweise über security-definer RPCs; Policy bleibt für Konsistenz.
create policy inbox_relations_insert_agency
  on public.inbox_relations
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.inbox_items as i
      where i.id = inbox_relations.inbox_item_id
        and public.user_has_active_agency_membership(i.agency_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 6. files / storage — Agency-Lesen über Inbox-Anhang
-- ---------------------------------------------------------------------------

drop policy if exists files_select_own_or_task_or_case_origin on public.files;

create policy files_select_own_or_task_or_inbox_agency
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
    or exists (
      select 1
      from public.inbox_item_files as iif
      inner join public.inbox_items as i on i.id = iif.inbox_item_id
      where iif.file_id = files.id
        and public.user_has_active_agency_membership(i.agency_id)
    )
    or exists (
      select 1
      from public.inbox_item_files as iif
      inner join public.cases as c on c.source_inbox_item_id = iif.inbox_item_id
      where iif.file_id = files.id
        and public.user_has_active_agency_membership(c.agency_id)
    )
  );

comment on policy files_select_own_or_task_or_inbox_agency on public.files is
  'Eigentümer, Task-Verknüpfung, gemeinsamer Inbox-Anhang oder Case-Ursprung.';

drop policy if exists user_files_storage_select_case_origin on storage.objects;

create policy user_files_storage_select_inbox_or_case_agency
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'user-files'
    and (
      exists (
        select 1
        from public.files as f
        inner join public.inbox_item_files as iif on iif.file_id = f.id
        inner join public.inbox_items as i on i.id = iif.inbox_item_id
        where f.storage_path = storage.objects.name
          and public.user_has_active_agency_membership(i.agency_id)
      )
      or exists (
        select 1
        from public.files as f
        inner join public.inbox_item_files as iif on iif.file_id = f.id
        inner join public.cases as c on c.source_inbox_item_id = iif.inbox_item_id
        where f.storage_path = storage.objects.name
          and public.user_has_active_agency_membership(c.agency_id)
      )
    )
  );

comment on policy user_files_storage_select_inbox_or_case_agency on storage.objects is
  'Agenturmitglieder dürfen Storage-Objekte lesen, die über Inbox oder Case-Ursprung verknüpft sind.';

-- ---------------------------------------------------------------------------
-- 7. Promotion-RPCs: Zugriff über inbox.agency_id statt Eigent-Eigentümer
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
  def text;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc as p
    inner join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_task_from_inbox_item',
        'create_case_from_inbox_item',
        'create_information_from_inbox_item'
      )
  loop
    def := pg_get_functiondef(r.sig);

    if position('v_inbox.user_id is distinct from v_user_id' in def) = 0 then
      raise notice 'skip % — ownership check not found (already patched?)', r.sig;
      continue;
    end if;

    def := replace(
      def,
      'v_inbox.user_id is distinct from v_user_id',
      'v_inbox.agency_id is distinct from v_agency_id'
    );

    execute def;
  end loop;
end;
$$;
