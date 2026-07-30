import { formatAgencyMemberDisplayName } from '@/features/agency/lib/format-agency-member-display-name'
import type { AgencyMember, AgencySummary } from '@/features/agency/types/agency-member'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type CurrentUserAgencyResult =
  | { success: true; agency: AgencySummary }
  | RepositoryError

type ListAgencyMembersResult =
  | { success: true; members: AgencyMember[] }
  | RepositoryError

async function getAuthenticatedUserId(): Promise<
  { success: true; userId: string } | RepositoryError
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      success: false,
      error: 'Sie sind nicht angemeldet.',
    }
  }

  return {
    success: true,
    userId: user.id,
  }
}

async function listActiveAgencyIdsForUser(
  userId: string,
): Promise<{ success: true; agencyIds: string[] } | RepositoryError> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agency_memberships')
    .select('agency_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) {
    return {
      success: false,
      error: 'Die Agenturmitgliedschaft konnte nicht geladen werden.',
    }
  }

  return {
    success: true,
    agencyIds: data.map((row) => row.agency_id),
  }
}

export async function getCurrentUserAgency(): Promise<CurrentUserAgencyResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const agencyIdsResult = await listActiveAgencyIdsForUser(authResult.userId)

  if (!agencyIdsResult.success) {
    return agencyIdsResult
  }

  if (agencyIdsResult.agencyIds.length === 0) {
    return {
      success: false,
      error: 'Es ist keine aktive Agenturmitgliedschaft vorhanden.',
    }
  }

  if (agencyIdsResult.agencyIds.length > 1) {
    return {
      success: false,
      error:
        'Mehrere aktive Agenturmitgliedschaften gefunden. Bitte wählen Sie zuerst eine Agentur aus.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agencies')
    .select('id, name, slug, status')
    .eq('id', agencyIdsResult.agencyIds[0])
    .maybeSingle()

  if (error || !data) {
    return {
      success: false,
      error: 'Die Agentur konnte nicht geladen werden.',
    }
  }

  return {
    success: true,
    agency: data,
  }
}

export async function listCurrentAgencyMembers(): Promise<ListAgencyMembersResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const { data: memberships, error: membershipsError } = await supabase
    .from('agency_memberships')
    .select('agency_id, user_id, role, status')
    .eq('agency_id', agencyResult.agency.id)
    .eq('status', 'active')

  if (membershipsError) {
    return {
      success: false,
      error: 'Die Agenturmitglieder konnten nicht geladen werden.',
    }
  }

  if (memberships.length === 0) {
    return {
      success: true,
      members: [],
    }
  }

  const userIds = memberships.map((membership) => membership.user_id)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, display_name')
    .in('id', userIds)

  if (profilesError) {
    return {
      success: false,
      error: 'Die Profile der Agenturmitglieder konnten nicht geladen werden.',
    }
  }

  const profilesByUserId = new Map(profiles.map((profile) => [profile.id, profile]))

  const members: AgencyMember[] = memberships.map((membership) => {
    const profile = profilesByUserId.get(membership.user_id)
    const profileFields = profile ?? {
      display_name: null,
      first_name: null,
      last_name: null,
    }

    return {
      userId: membership.user_id,
      agencyId: membership.agency_id,
      role: membership.role,
      membershipStatus: membership.status,
      displayName: formatAgencyMemberDisplayName(profileFields),
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
    }
  })

  return {
    success: true,
    members,
  }
}
