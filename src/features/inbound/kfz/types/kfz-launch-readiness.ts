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

/** Owner-facing answer. READY is configuration, not a production approval. */
export const KFZ_LAUNCH_OWNER_STATUSES = ['READY', 'BLOCKED', 'UNKNOWN'] as const

export type KfzLaunchOwnerStatus = (typeof KFZ_LAUNCH_OWNER_STATUSES)[number]

export const KFZ_LAUNCH_CHECK_IDS = [
  'questionnaire',
  'public_configuration',
  'migrations',
  'private_documents',
  'submission_persistence',
  'inbox_item_creation',
  'authorized_review',
  'analytics',
] as const

export type KfzLaunchCheckId = (typeof KFZ_LAUNCH_CHECK_IDS)[number]

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
  requiredFor: 'intake' | 'persist' | 'public' | 'optional'
}

export type KfzLaunchCheck = {
  id: KfzLaunchCheckId
  label: string
  status: KfzLaunchOwnerStatus
  detail: string
  /** One concrete, secret-safe next step when status is not READY. */
  nextAction: string | null
  refs: readonly KfzLaunchReadinessRef[]
}

export type KfzLaunchProbeId = 'unauthorized_review' | 'persist_unavailable'

export type KfzLaunchProbeOutcome =
  | 'rejected'
  | 'allowed'
  | 'fail_closed'
  | 'open'
  | 'unavailable'

export type KfzLaunchProbe = {
  id: KfzLaunchProbeId
  status: KfzLaunchOwnerStatus
  outcome: KfzLaunchProbeOutcome
  detail: string
}

export type KfzLaunchOwnerCounts = {
  ready: number
  blocked: number
  unknown: number
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
  result: KfzLaunchOwnerStatus
  resultDetail: string
  nextAction: string | null
  checks: readonly KfzLaunchCheck[]
  probes: readonly KfzLaunchProbe[]
  ownerCounts: KfzLaunchOwnerCounts
  counts: KfzLaunchReadinessCounts
  env: readonly KfzLaunchEnvPresence[]
  files: readonly KfzLaunchFilePresence[]
  items: readonly KfzLaunchReadinessItem[]
}
