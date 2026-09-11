/**
 * Test-only Kfz migration-chain dry-run contract.
 * In-memory Postgres only. Not a production apply or approval.
 * Failures are named by check or migration file only.
 */

export const KFZ_MIGRATION_CHAIN_SCOPE = 'test_only_in_memory' as const

export const KFZ_MIGRATION_CHAIN_ENGINE = 'pglite_memory' as const

export const KFZ_MIGRATION_CHAIN_TARGETS = ['empty', 'legacy_pre_analytics'] as const

export type KfzMigrationChainTarget = (typeof KFZ_MIGRATION_CHAIN_TARGETS)[number]

export const KFZ_MIGRATION_CHAIN_CHECK_IDS = [
  'seed_foundation',
  'apply_first',
  'apply_second',
  'private_bucket',
  'private_bucket_policies',
  'submission_inbox_linkage',
  'authorized_review',
  'analytics_allowlist',
  'unique_retry',
  'no_public_reads',
  'preserved_surfaces',
] as const

export type KfzMigrationChainCheckId = (typeof KFZ_MIGRATION_CHAIN_CHECK_IDS)[number]

export type KfzMigrationChainCheckResult = {
  id: KfzMigrationChainCheckId
  ok: boolean
  /** Checked-in migration file name, or null when the check is not file-specific. */
  migration: string | null
}

export type KfzMigrationChainPreservedSurfaces = {
  routes: boolean
  sixBranches: boolean
  questionnaire: boolean
  consent: boolean
  readiness: boolean
  analyticsUi: boolean
}

export type KfzMigrationChainTargetReport = {
  target: KfzMigrationChainTarget
  ok: boolean
  applyPasses: 0 | 1 | 2
  checks: readonly KfzMigrationChainCheckResult[]
}

export type KfzMigrationChainReport = {
  ok: boolean
  scope: typeof KFZ_MIGRATION_CHAIN_SCOPE
  productionClaim: false
  appliesRemote: false
  engine: typeof KFZ_MIGRATION_CHAIN_ENGINE
  targets: readonly KfzMigrationChainTargetReport[]
  preserved: KfzMigrationChainPreservedSurfaces
}
