export type AgencyStatus = 'active' | 'suspended' | 'archived'
export type MembershipRole = 'owner' | 'member'
export type MembershipStatus = 'active' | 'suspended' | 'removed'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          display_name: string | null
          locale: string
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          display_name?: string | null
          locale?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          display_name?: string | null
          locale?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      agencies: {
        Row: {
          id: string
          name: string
          slug: string
          status: AgencyStatus
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          status?: AgencyStatus
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          status?: AgencyStatus
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      agency_memberships: {
        Row: {
          id: string
          agency_id: string
          user_id: string
          role: MembershipRole
          status: MembershipStatus
          joined_at: string
          suspended_at: string | null
          removed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          user_id: string
          role?: MembershipRole
          status?: MembershipStatus
          joined_at?: string
          suspended_at?: string | null
          removed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          user_id?: string
          role?: MembershipRole
          status?: MembershipStatus
          joined_at?: string
          suspended_at?: string | null
          removed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      initialize_current_user_account: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      agency_status: AgencyStatus
      membership_role: MembershipRole
      membership_status: MembershipStatus
    }
    CompositeTypes: Record<string, never>
  }
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
