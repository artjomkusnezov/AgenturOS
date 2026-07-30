-- AgenturOS Punkt 24B: Agentur-Zusammenarbeit auf tasks erweitern

-- Hilfsfunktion: Prüft aktive Mitgliedschaft eines beliebigen Benutzers in einer Agentur

create or replace function public.user_is_active_member_of_agency(
  p_user_id uuid,
  p_agency_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.agency_memberships as m
    where m.user_id = p_user_id
      and m.agency_id = p_agency_id
      and m.status = 'active'::public.membership_status
  );
$$;

comment on function public.user_is_active_member_of_agency(uuid, uuid) is
  'Prüft, ob ein Benutzer aktives Mitglied der angegebenen Agentur ist.';

revoke all on function public.user_is_active_member_of_agency(uuid, uuid) from public;
revoke all on function public.user_is_active_member_of_agency(uuid, uuid) from anon;
revoke all on function public.user_is_active_member_of_agency(uuid, uuid) from service_role;
grant execute on function public.user_is_active_member_of_agency(uuid, uuid) to authenticated;

-- Neue Spalten (zunächst nullable für Backfill)

alter table public.tasks
  add column agency_id uuid,
  add column created_by uuid,
  add column assignee_user_id uuid;

comment on column public.tasks.agency_id is 'Fachliche Agenturzugehörigkeit des Vorgangs.';
comment on column public.tasks.created_by is 'Ursprünglicher Ersteller; nach Anlage unveränderlich.';
comment on column public.tasks.assignee_user_id is 'Aktuell Verantwortlicher; optional.';

-- Backfill-Guards: jede Aufgabe benötigt genau eine aktive Agenturmitgliedschaft des bisherigen user_id

do $$
declare
  v_invalid_task_count integer;
begin
  select count(*)::integer
  into v_invalid_task_count
  from public.tasks as t
  where (
    select count(*)::integer
    from public.agency_memberships as m
    where m.user_id = t.user_id
      and m.status = 'active'::public.membership_status
  ) <> 1;

  if v_invalid_task_count > 0 then
    raise exception
      'task backfill aborted: % task(s) without exactly one active agency membership',
      v_invalid_task_count
      using errcode = 'P0001';
  end if;
end;
$$;

update public.tasks as t
set
  created_by = t.user_id,
  agency_id = (
    select m.agency_id
    from public.agency_memberships as m
    where m.user_id = t.user_id
      and m.status = 'active'::public.membership_status
  ),
  assignee_user_id = null;

do $$
declare
  v_incomplete_task_count integer;
begin
  select count(*)::integer
  into v_incomplete_task_count
  from public.tasks as t
  where t.agency_id is null
     or t.created_by is null;

  if v_incomplete_task_count > 0 then
    raise exception
      'task backfill aborted: % task(s) missing agency_id or created_by',
      v_incomplete_task_count
      using errcode = 'P0001';
  end if;
end;
$$;

alter table public.tasks
  alter column agency_id set not null,
  alter column created_by set not null;

-- Foreign Keys

alter table public.tasks
  add constraint tasks_agency_id_fkey
    foreign key (agency_id)
    references public.agencies (id)
    on delete restrict,
  add constraint tasks_created_by_fkey
    foreign key (created_by)
    references auth.users (id)
    on delete restrict,
  add constraint tasks_assignee_user_id_fkey
    foreign key (assignee_user_id)
    references auth.users (id)
    on delete set null;

-- Indizes

create index tasks_agency_id_idx
  on public.tasks (agency_id);

create index tasks_created_by_idx
  on public.tasks (created_by);

create index tasks_assignee_user_id_idx
  on public.tasks (assignee_user_id);

-- Unveränderlichkeit von created_by

create or replace function public.prevent_task_created_by_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by cannot be changed'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function public.prevent_task_created_by_change() is
  'Verhindert nachträgliche Änderungen an tasks.created_by.';

create trigger tasks_prevent_created_by_change
  before update on public.tasks
  for each row
  execute function public.prevent_task_created_by_change();

-- Row Level Security: benutzerbezogene Policies durch Agenturzugriff ersetzen

drop policy if exists tasks_select_own on public.tasks;
drop policy if exists tasks_insert_own on public.tasks;
drop policy if exists tasks_update_own on public.tasks;
drop policy if exists tasks_delete_own on public.tasks;

create policy tasks_select_agency_member
  on public.tasks
  for select
  to authenticated
  using (public.user_has_active_agency_membership(agency_id));

create policy tasks_insert_agency_member
  on public.tasks
  for insert
  to authenticated
  with check (
    public.user_has_active_agency_membership(agency_id)
    and created_by = (select auth.uid())
    and user_id = (select auth.uid())
    and (
      assignee_user_id is null
      or public.user_is_active_member_of_agency(assignee_user_id, agency_id)
    )
  );

create policy tasks_update_agency_member
  on public.tasks
  for update
  to authenticated
  using (public.user_has_active_agency_membership(agency_id))
  with check (
    public.user_has_active_agency_membership(agency_id)
    and (
      assignee_user_id is null
      or public.user_is_active_member_of_agency(assignee_user_id, agency_id)
    )
  );

create policy tasks_delete_agency_member
  on public.tasks
  for delete
  to authenticated
  using (public.user_has_active_agency_membership(agency_id));

-- Inbox-Konvertierung: neue Felder setzen

create or replace function public.create_task_from_inbox_item(p_inbox_item_id uuid)
returns table (
  inbox_item_id uuid,
  task_id uuid,
  relation_id uuid,
  already_existed boolean
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_agency_id uuid;
  v_active_membership_count integer;
  v_inbox public.inbox_items%rowtype;
  v_existing_relation public.inbox_relations%rowtype;
  v_task_id uuid;
  v_relation_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  select count(*)::integer
  into v_active_membership_count
  from public.agency_memberships as m
  where m.user_id = v_user_id
    and m.status = 'active'::public.membership_status;

  if v_active_membership_count = 0 then
    raise exception 'no active agency membership'
      using errcode = 'P0001';
  end if;

  if v_active_membership_count > 1 then
    raise exception 'ambiguous active agency membership'
      using errcode = 'P0001';
  end if;

  select m.agency_id
  into v_agency_id
  from public.agency_memberships as m
  where m.user_id = v_user_id
    and m.status = 'active'::public.membership_status;

  select *
  into v_inbox
  from public.inbox_items
  where id = p_inbox_item_id
  for update;

  if not found then
    raise exception 'inbox item not found'
      using errcode = 'P0001';
  end if;

  if v_inbox.user_id is distinct from v_user_id then
    raise exception 'access denied'
      using errcode = '42501';
  end if;

  if trim(v_inbox.content) = '' then
    raise exception 'inbox content empty'
      using errcode = 'P0001';
  end if;

  select *
  into v_existing_relation
  from public.inbox_relations
  where inbox_relations.inbox_item_id = p_inbox_item_id
    and inbox_relations.relation_type = 'task';

  if found then
    if v_inbox.processed_at is null then
      update public.inbox_items
      set
        processed_at = now(),
        updated_at = now()
      where id = p_inbox_item_id;
    end if;

    return query
    select
      p_inbox_item_id,
      v_existing_relation.relation_id,
      v_existing_relation.id,
      true;
    return;
  end if;

  insert into public.tasks (
    user_id,
    created_by,
    agency_id,
    assignee_user_id,
    title,
    description
  )
  values (
    v_user_id,
    v_user_id,
    v_agency_id,
    null,
    v_inbox.content,
    null
  )
  returning id into v_task_id;

  insert into public.inbox_relations (
    inbox_item_id,
    relation_type,
    relation_id
  )
  values (
    p_inbox_item_id,
    'task',
    v_task_id
  )
  returning id into v_relation_id;

  update public.inbox_items
  set
    processed_at = now(),
    updated_at = now()
  where id = p_inbox_item_id;

  return query
  select
    p_inbox_item_id,
    v_task_id,
    v_relation_id,
    false;
end;
$$;

comment on function public.create_task_from_inbox_item(uuid) is
  'Erstellt atomar eine Aufgabe aus einem Eingangselement und verknüpft beide dauerhaft.';

revoke all on function public.create_task_from_inbox_item(uuid) from public;
revoke all on function public.create_task_from_inbox_item(uuid) from anon;
grant execute on function public.create_task_from_inbox_item(uuid) to authenticated;
