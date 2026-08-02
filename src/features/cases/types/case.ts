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

/** Systemweite Case-Type-Keys (seeds in case_types, agency_id null). */
export const SYSTEM_CASE_TYPE_KEYS = [
  'task',
  'offer',
  'claim',
  'appointment',
  'follow_up',
  'contract',
  'general',
] as const

export type SystemCaseTypeKey = (typeof SYSTEM_CASE_TYPE_KEYS)[number]

export function isSystemCaseTypeKey(value: string): value is SystemCaseTypeKey {
  return (SYSTEM_CASE_TYPE_KEYS as readonly string[]).includes(value)
}
