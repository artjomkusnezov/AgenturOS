import type { Database } from '@/lib/supabase/types'

export type AgencyStatus = Database['public']['Enums']['agency_status']
export type MembershipRole = Database['public']['Enums']['membership_role']
export type MembershipStatus = Database['public']['Enums']['membership_status']

export type AgencySummary = {
  id: string
  name: string
  slug: string
  status: AgencyStatus
}

export type AgencyMember = {
  userId: string
  agencyId: string
  role: MembershipRole
  membershipStatus: MembershipStatus
  displayName: string
  firstName: string | null
  lastName: string | null
}
