-- AgenturOS Punkt 24A: Lesebasis für Agentur-Zusammenarbeit (Memberships, Profile, Agenturen)

-- Hilfsfunktionen (SECURITY DEFINER, nur Lesen, verhindert RLS-Rekursion)

create or replace function public.user_has_active_agency_membership(p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.agency_memberships as m
    where m.agency_id = p_agency_id
      and m.user_id = auth.uid()
      and m.status = 'active'::public.membership_status
  );
$$;

comment on function public.user_has_active_agency_membership(uuid) is
  'Prüft, ob der aktuelle Benutzer aktives Mitglied der angegebenen Agentur ist.';

create or replace function public.user_shares_active_agency_with(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.agency_memberships as own_membership
    inner join public.agency_memberships as peer_membership
      on peer_membership.agency_id = own_membership.agency_id
    where own_membership.user_id = auth.uid()
      and own_membership.status = 'active'::public.membership_status
      and peer_membership.user_id = p_other_user_id
      and peer_membership.status = 'active'::public.membership_status
  );
$$;

comment on function public.user_shares_active_agency_with(uuid) is
  'Prüft, ob der aktuelle Benutzer mindestens eine gemeinsame aktive Agenturmitgliedschaft mit einem anderen Benutzer hat.';

revoke all on function public.user_has_active_agency_membership(uuid) from public;
revoke all on function public.user_has_active_agency_membership(uuid) from anon;
revoke all on function public.user_has_active_agency_membership(uuid) from service_role;
grant execute on function public.user_has_active_agency_membership(uuid) to authenticated;

revoke all on function public.user_shares_active_agency_with(uuid) from public;
revoke all on function public.user_shares_active_agency_with(uuid) from anon;
revoke all on function public.user_shares_active_agency_with(uuid) from service_role;
grant execute on function public.user_shares_active_agency_with(uuid) to authenticated;

-- Row Level Security: agencies

create policy agencies_select_active_member
  on public.agencies
  for select
  to authenticated
  using (public.user_has_active_agency_membership(id));

-- Row Level Security: agency_memberships

create policy agency_memberships_select_same_agency_active
  on public.agency_memberships
  for select
  to authenticated
  using (
    status = 'active'::public.membership_status
    and public.user_has_active_agency_membership(agency_id)
  );

-- Row Level Security: profiles (ergänzt profiles_select_own)

create policy profiles_select_agency_peers
  on public.profiles
  for select
  to authenticated
  using (public.user_shares_active_agency_with(id));
