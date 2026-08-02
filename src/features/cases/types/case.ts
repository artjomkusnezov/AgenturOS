import type { Tables } from '@/lib/supabase/types'

export type CaseRecord = Tables<'cases'>
export type CaseTypeRecord = Tables<'case_types'>
export type BusinessAreaRecord = Tables<'business_areas'>

export type CaseCoreStatus = CaseRecord['core_status']

export const CASE_CORE_STATUSES = [
  'open',
  'in_progress',
  'waiting',
  'completed',
  'cancelled',
] as const satisfies readonly CaseCoreStatus[]

export type CasePriority = CaseRecord['priority']
