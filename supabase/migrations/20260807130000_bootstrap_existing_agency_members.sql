-- AgenturOS Punkt 34A.0c: Bootstrap für bestehende Agency-Mitglieder
-- Problem: initialize_current_user_account verlangte raw_user_meta_data
-- (first_name, last_name, agency_name) BEVOR der Existing-Path geprüft wurde.
-- Manuell angelegte Mitglieder (Profil + Membership, ohne Register-Metadaten)
-- scheiterten deshalb nach erfolgreichem Login.
-- Fix: Existing-Path zuerst; Metadaten nur für Neu-Anlage.

create or replace function public.initialize_current_user_account()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_meta jsonb;
  v_first_name text;
  v_last_name text;
  v_agency_name text;
  v_display_name text;
  v_profile_exists boolean;
  v_membership_count integer;
  v_existing_agency_id uuid;
  v_agency_exists boolean;
  v_agency_id uuid;
  v_slug_base text;
  v_slug text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = '28000';
  end if;

  select exists (
    select 1
    from public.profiles as p
    where p.id = v_user_id
  )
  into v_profile_exists;

  select count(*)::integer
  into v_membership_count
  from public.agency_memberships as m
  where m.user_id = v_user_id;

  -- Bestehendes Konto: Profil + genau eine Membership → keine neue Agency.
  if v_profile_exists and v_membership_count = 1 then
    select m.agency_id
    into v_existing_agency_id
    from public.agency_memberships as m
    where m.user_id = v_user_id;

    select exists (
      select 1
      from public.agencies as a
      where a.id = v_existing_agency_id
    )
    into v_agency_exists;

    if v_agency_exists then
      perform public.seed_default_business_areas_for_agency(v_existing_agency_id);
      perform public.seed_default_workspace_views_for_agency(v_existing_agency_id, v_user_id);
      perform public.seed_default_knowledge_collections_for_agency(v_existing_agency_id);
      return v_existing_agency_id;
    end if;

    raise exception 'inconsistent account bootstrap state'
      using errcode = 'P0001';
  end if;

  -- Neu-Anlage: Metadaten aus der Registrierung sind erforderlich.
  select u.raw_user_meta_data
  into v_meta
  from auth.users as u
  where u.id = v_user_id;

  if v_meta is null then
    raise exception 'missing user metadata'
      using errcode = 'P0001';
  end if;

  v_first_name := trim(v_meta ->> 'first_name');
  v_last_name := trim(v_meta ->> 'last_name');
  v_agency_name := trim(v_meta ->> 'agency_name');

  if v_first_name is null or v_first_name = '' then
    raise exception 'missing first_name'
      using errcode = 'P0001';
  end if;

  if v_last_name is null or v_last_name = '' then
    raise exception 'missing last_name'
      using errcode = 'P0001';
  end if;

  if v_agency_name is null or v_agency_name = '' then
    raise exception 'missing agency_name'
      using errcode = 'P0001';
  end if;

  if not v_profile_exists and v_membership_count = 0 then
    v_slug_base := lower(
      regexp_replace(v_agency_name, '[^a-zA-Z0-9]+', '-', 'g')
    );
    v_slug_base := trim(both '-' from v_slug_base);

    if v_slug_base = '' then
      raise exception 'invalid agency_name'
        using errcode = 'P0001';
    end if;

    v_slug := v_slug_base || '-' || substr(replace(v_user_id::text, '-', ''), 1, 8);
    v_display_name := v_first_name || ' ' || v_last_name;

    insert into public.profiles (
      id,
      first_name,
      last_name,
      display_name
    )
    values (
      v_user_id,
      v_first_name,
      v_last_name,
      v_display_name
    );

    insert into public.agencies (
      name,
      slug,
      created_by
    )
    values (
      v_agency_name,
      v_slug,
      v_user_id
    )
    returning id into v_agency_id;

    insert into public.agency_memberships (
      agency_id,
      user_id,
      role,
      status
    )
    values (
      v_agency_id,
      v_user_id,
      'owner',
      'active'
    );

    perform public.seed_default_business_areas_for_agency(v_agency_id);
    perform public.seed_default_workspace_views_for_agency(v_agency_id, v_user_id);
    perform public.seed_default_knowledge_collections_for_agency(v_agency_id);

    return v_agency_id;
  end if;

  raise exception 'inconsistent account bootstrap state'
    using errcode = 'P0001';
end;
$$;

comment on function public.initialize_current_user_account() is
  'Bootstrap: bestehende Profile+Membership wiederverwenden; sonst Profil, Agentur und Owner-Mitgliedschaft anlegen.';
