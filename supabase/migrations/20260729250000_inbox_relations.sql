-- AgenturOS: Eingang-Relationen und atomare Task-Übernahme

create table public.inbox_relations (
  id uuid primary key default gen_random_uuid(),
  inbox_item_id uuid not null references public.inbox_items (id) on delete cascade,
  relation_type text not null,
  relation_id uuid not null references public.tasks (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint inbox_relations_type_valid check (relation_type in ('task')),
  constraint inbox_relations_inbox_item_type_unique unique (inbox_item_id, relation_type)
);

comment on table public.inbox_relations is 'Verknüpfung zwischen Eingangselementen und Zielobjekten.';
comment on column public.inbox_relations.relation_type is 'Typ des verknüpften Zielobjekts; in Punkt 16 ausschließlich task.';
comment on column public.inbox_relations.relation_id is 'ID der verknüpften Aufgabe.';

create index inbox_relations_inbox_item_id_idx
  on public.inbox_relations (inbox_item_id);

create index inbox_relations_relation_id_idx
  on public.inbox_relations (relation_id);

alter table public.inbox_relations enable row level security;

create policy inbox_relations_select_own
  on public.inbox_relations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.inbox_items
      where inbox_items.id = inbox_relations.inbox_item_id
        and inbox_items.user_id = (select auth.uid())
    )
  );

create policy inbox_relations_insert_own
  on public.inbox_relations
  for insert
  to authenticated
  with check (
    relation_type = 'task'
    and exists (
      select 1
      from public.inbox_items
      where inbox_items.id = inbox_relations.inbox_item_id
        and inbox_items.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.tasks
      where tasks.id = inbox_relations.relation_id
        and tasks.user_id = (select auth.uid())
    )
  );

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
    title,
    description
  )
  values (
    v_user_id,
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
