/**
 * Secret-safe Kfz release / migration handoff contract.
 * Not a production approval. Names, routes and filenames only.
 */

export const KFZ_RELEASE_HANDOFF_DOC = 'docs/kfz-release-handoff.md' as const

export const KFZ_RELEASE_HANDOFF_SCOPE = 'local_code_contract' as const

export const KFZ_RELEASE_HANDOFF_DISCLAIMER =
  'Keine Produktionsfreigabe. Dieses Handoff listet Merge-Reihenfolge, Migrationsdateien, Env-Namen, Prüfcommands und Owner-Schritte. Werte, Antworten, Dateinamen von Kunden, Object-Keys und Personenbezüge stehen nicht hier. Merge, Apply, Deploy und Production-Datenbank bleiben Owner.'

export const KFZ_RELEASE_HANDOFF_HEADLINE =
  'Kfz-Release-Handoff · Kette und Migrationen, ohne Secrets'

export const KFZ_RELEASE_HANDOFF_STATUSES = ['PASS', 'BLOCKED'] as const

export type KfzReleaseHandoffStatus = (typeof KFZ_RELEASE_HANDOFF_STATUSES)[number]

export const KFZ_RELEASE_ACTORS = ['automated', 'owner'] as const

export type KfzReleaseActor = (typeof KFZ_RELEASE_ACTORS)[number]

export type KfzReleaseStackedPr = {
  number: number
  title: string
  headRef: string
  baseRef: string
  /** Last commit on that stacked PR; must be an ancestor of this branch. */
  tipSha: string
}

export type KfzReleaseMigrationStep = {
  file: string
  purpose: string
  introducingSha: string
  introducingPr: number
  introducingPrNote: string
}

export type KfzReleaseEnvName = {
  name: string
  fallbackName?: string
  required: boolean
}

export type KfzReleaseRoute = {
  href: string
  file: string
}

export type KfzReleaseCommand = {
  command: string
  actor: KfzReleaseActor
}

export type KfzReleaseOwnerStep = {
  id: string
  label: string
}

export type KfzReleaseStopCondition = {
  id: string
  label: string
}

export type KfzReleasePreviewCheck = {
  id: string
  label: string
}

export type KfzReleaseHandoffSurface = {
  documentPath: typeof KFZ_RELEASE_HANDOFF_DOC
  present: boolean
  matchesRenderer: boolean
  migrationsMatch: boolean
  routesMatch: boolean
  stackPrNumbers: readonly number[]
  migrationFiles: readonly string[]
  automatedCommands: readonly string[]
  ownerStepIds: readonly string[]
  stopConditionIds: readonly string[]
  status: KfzReleaseHandoffStatus
}
