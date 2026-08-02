import type { SystemCaseTypeKey } from '@/features/cases/types/case'
import type { Tables } from '@/lib/supabase/types'

export type WorkspaceViewRecord = Tables<'workspace_views'>

export type WorkspaceViewScope = 'cases'

export const WORKSPACE_VIEW_SORT_OPTIONS = [
  'updated_at_desc',
  'created_at_desc',
  'due_at_asc',
  'priority_desc',
] as const

export type WorkspaceViewSort = (typeof WORKSPACE_VIEW_SORT_OPTIONS)[number]

export const WORKSPACE_VIEW_OPEN_CORE_STATUSES = [
  'open',
  'in_progress',
  'waiting',
] as const

export type WorkspaceViewFilters = {
  case_type_keys?: SystemCaseTypeKey[]
  business_area_keys?: string[]
  core_statuses?: string[]
  assignee_user_id?: string | null
  due_from?: string | null
  due_to?: string | null
  is_overdue?: boolean
}

export type WorkspaceView = {
  id: string
  agency_id: string
  key: string
  name: string
  icon: string | null
  scope: WorkspaceViewScope
  filters: WorkspaceViewFilters
  sort: WorkspaceViewSort
  visible_in_navigation: boolean
  visible_on_dashboard: boolean
  sort_order: number
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type WorkspaceViewNavItem = Pick<
  WorkspaceView,
  'id' | 'key' | 'name' | 'icon' | 'sort_order'
>
