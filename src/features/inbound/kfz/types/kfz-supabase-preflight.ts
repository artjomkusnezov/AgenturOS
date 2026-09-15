/**
 * Deterministic Kfz Supabase configuration preflight.
 * Not a production approval and never a secret dump.
 */

export const KFZ_SUPABASE_PREFLIGHT_STATUSES = [
  'PASS',
  'BLOCKED',
  'OWNER_INPUT',
  'NOT_VERIFIED',
] as const

export type KfzSupabasePreflightStatus =
  (typeof KFZ_SUPABASE_PREFLIGHT_STATUSES)[number]

export type KfzSupabasePreflightCheckKind = 'contract' | 'runtime' | 'owner'

export type KfzSupabasePreflightEnvPresence = {
  name: string
  present: boolean
  required: boolean
}

export type KfzSupabasePreflightCheck = {
  id: string
  label: string
  kind: KfzSupabasePreflightCheckKind
  status: KfzSupabasePreflightStatus
  detail: string
}

export type KfzSupabaseOwnerChecklistStep = {
  id: string
  tool: 'Supabase' | 'Vercel'
  instruction: string
}

export type KfzSupabasePreflightCounts = {
  pass: number
  blocked: number
  ownerInput: number
  notVerified: number
}

export type KfzSupabasePreflightReport = {
  generatedAt: string
  command: 'preflight:kfz-supabase'
  scope: 'local_code_contract'
  productionClaim: false
  appliesMigrations: false
  deploys: false
  disclaimer: string
  headline: string
  env: readonly KfzSupabasePreflightEnvPresence[]
  checks: readonly KfzSupabasePreflightCheck[]
  ownerChecklist: readonly KfzSupabaseOwnerChecklistStep[]
  counts: KfzSupabasePreflightCounts
  contractOk: boolean
  thisProcessConfigured: boolean
}
