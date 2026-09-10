/**
 * Factual Kfz launch-readiness checklist. Not a production approval.
 */

export const KFZ_LAUNCH_READINESS_STATUSES = [
  'PASS',
  'BLOCKED',
  'OWNER_INPUT',
  'NOT_VERIFIED',
] as const

export type KfzLaunchReadinessStatus =
  (typeof KFZ_LAUNCH_READINESS_STATUSES)[number]

export type KfzLaunchReadinessRefKind =
  | 'route'
  | 'migration'
  | 'env'
  | 'doc'
  | 'code'

export type KfzLaunchReadinessRef = {
  kind: KfzLaunchReadinessRefKind
  label: string
  href?: string
  path?: string
  envName?: string
}

export type KfzLaunchReadinessFact = {
  id: string
  label: string
  status: KfzLaunchReadinessStatus
  detail: string
  refs: readonly KfzLaunchReadinessRef[]
}

export type KfzLaunchReadinessItem = {
  id: string
  title: string
  summary: string
  facts: readonly KfzLaunchReadinessFact[]
}

export type KfzLaunchEnvPresence = {
  name: string
  present: boolean
  fallbackName?: string
  fallbackPresent?: boolean
  requiredFor: 'intake' | 'persist' | 'optional'
}

export type KfzLaunchFilePresence = {
  path: string
  present: boolean
}

export type KfzLaunchReadinessCounts = {
  pass: number
  blocked: number
  ownerInput: number
  notVerified: number
}

export type KfzLaunchReadinessReport = {
  generatedAt: string
  scope: 'local_code_contract'
  productionClaim: false
  disclaimer: string
  headline: string
  counts: KfzLaunchReadinessCounts
  env: readonly KfzLaunchEnvPresence[]
  files: readonly KfzLaunchFilePresence[]
  items: readonly KfzLaunchReadinessItem[]
}
