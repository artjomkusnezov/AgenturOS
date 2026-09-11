/**
 * Secret-safe Kfz release chain and migration handoff.
 *
 * Encodes the stacked PR/commit dependency as derived from this branch and
 * the checked-in SQL files. Never reads, prints or stores secret values,
 * customer data, answers, object keys, document contents or personal
 * identifiers. Does not merge, deploy or apply remote migrations.
 */

import fs from 'node:fs'
import path from 'node:path'

import type {
  KfzReleaseCommand,
  KfzReleaseEnvName,
  KfzReleaseHandoffSurface,
  KfzReleaseMigrationStep,
  KfzReleaseOwnerStep,
  KfzReleasePreviewCheck,
  KfzReleaseRoute,
  KfzReleaseStackedPr,
  KfzReleaseStopCondition,
} from '@/features/inbound/kfz/types/kfz-release-handoff'
import {
  KFZ_RELEASE_HANDOFF_DISCLAIMER,
  KFZ_RELEASE_HANDOFF_DOC,
  KFZ_RELEASE_HANDOFF_HEADLINE,
} from '@/features/inbound/kfz/types/kfz-release-handoff'

export {
  KFZ_RELEASE_HANDOFF_DISCLAIMER,
  KFZ_RELEASE_HANDOFF_DOC,
  KFZ_RELEASE_HANDOFF_HEADLINE,
}

export const KFZ_RELEASE_HANDOFF_BRANCH =
  'cursor/agenturos-controller-task-ee86' as const

export const KFZ_RELEASE_HANDOFF_BASE_BRANCH =
  'cursor/agenturos-controller-task-8bd0' as const

export const KFZ_RELEASE_HANDOFF_BASE_PR = 54 as const

export const KFZ_RELEASE_STACK_BASE_BRANCH =
  'cursor/agenturos-controller-task-52f4' as const

export const KFZ_RELEASE_STACK_BASE_SHA = '3f5cf0e' as const

export const KFZ_RELEASE_PARALLEL_GATE2_PR = 19 as const

export const KFZ_RELEASE_PARALLEL_GATE2_HEAD = 'agent/issue-18' as const

/**
 * Open stacked PRs in merge-first order (bottom of the stack first).
 * Derived by walking each PR baseRef from #54 down to #22.
 */
export const KFZ_RELEASE_STACKED_PRS: readonly KfzReleaseStackedPr[] = [
  {
    number: 22,
    title: 'Add manual Kfz response draft workspace',
    headRef: 'cursor/agenturos-controller-task-3d66',
    baseRef: KFZ_RELEASE_STACK_BASE_BRANCH,
    tipSha: 'c85589a',
  },
  {
    number: 24,
    title: 'Add daily Kfz inquiry work queue',
    headRef: 'cursor/agenturos-controller-task-80f0',
    baseRef: 'cursor/agenturos-controller-task-3d66',
    tipSha: '5625427',
  },
  {
    number: 25,
    title: 'Put the daily Kfz queue into the authenticated inbox',
    headRef: 'cursor/agenturos-controller-task-0f60',
    baseRef: 'cursor/agenturos-controller-task-80f0',
    tipSha: '7ee0203',
  },
  {
    number: 27,
    title: 'Add manual capture source labels for phone, email and notes',
    headRef: 'cursor/agenturos-controller-task-d280',
    baseRef: 'cursor/agenturos-controller-task-0f60',
    tipSha: '913f133',
  },
  {
    number: 28,
    title: 'Warn about likely duplicates before confirming a manual capture',
    headRef: 'cursor/agenturos-controller-task-dd22',
    baseRef: 'cursor/agenturos-controller-task-d280',
    tipSha: 'dc1d235',
  },
  {
    number: 29,
    title: 'Turn a manual capture into the existing Kfz review card',
    headRef: 'cursor/agenturos-controller-task-2ebd',
    baseRef: 'cursor/agenturos-controller-task-dd22',
    tipSha: '9c716e7',
  },
  {
    number: 30,
    title: 'Unified daily inbox with human source filters',
    headRef: 'cursor/agenturos-controller-task-882b',
    baseRef: 'cursor/agenturos-controller-task-2ebd',
    tipSha: '92b304e',
  },
  {
    number: 31,
    title: 'Show factual review history inside each inbound item',
    headRef: 'cursor/agenturos-controller-task-c268',
    baseRef: 'cursor/agenturos-controller-task-882b',
    tipSha: '90de96d',
  },
  {
    number: 32,
    title: 'Mobile-first Kfz landing intake with optional documents',
    headRef: 'cursor/agenturos-controller-task-7f68',
    baseRef: 'cursor/agenturos-controller-task-c268',
    tipSha: '4607e85',
  },
  {
    number: 33,
    title: 'Reliable Kfz landing submit and retry',
    headRef: 'cursor/agenturos-controller-task-f287',
    baseRef: 'cursor/agenturos-controller-task-7f68',
    tipSha: '46cb4b8',
  },
  {
    number: 34,
    title: 'Manual preferred-channel reply handoff for Kfz inquiries',
    headRef: 'cursor/agenturos-controller-task-e134',
    baseRef: 'cursor/agenturos-controller-task-f287',
    tipSha: '6314c05',
  },
  {
    number: 35,
    title: 'Add factual unattended-inbound work queue',
    headRef: 'cursor/agenturos-controller-task-cc15',
    baseRef: 'cursor/agenturos-controller-task-e134',
    tipSha: 'b7b9fa0',
  },
  {
    number: 36,
    title: 'Add factual search across the unified inbound queue',
    headRef: 'cursor/agenturos-controller-task-c3f6',
    baseRef: 'cursor/agenturos-controller-task-cc15',
    tipSha: '9f9718e',
  },
  {
    number: 37,
    title: 'Add exact duplicate review on inbound cards',
    headRef: 'cursor/agenturos-controller-task-83d4',
    baseRef: 'cursor/agenturos-controller-task-c3f6',
    tipSha: '94eed48',
  },
  {
    number: 38,
    title: 'Port approved Kfz landing redesign onto current inbound flow',
    headRef: 'cursor/agenturos-controller-task-c467',
    baseRef: 'cursor/agenturos-controller-task-83d4',
    tipSha: 'ae5bf6b',
  },
  {
    number: 39,
    title: 'Add full no-document Allianz Kfz question flow for manual review',
    headRef: 'cursor/agenturos-controller-task-ff2e',
    baseRef: 'cursor/agenturos-controller-task-c467',
    tipSha: 'f2e83a9',
  },
  {
    number: 40,
    title: 'Add privacy-safe first-party Kfz funnel analytics',
    headRef: 'cursor/agenturos-controller-task-e04c',
    baseRef: 'cursor/agenturos-controller-task-ff2e',
    tipSha: '40e30c4',
  },
  {
    number: 41,
    title: 'Correct Kfz SF classes and deductible choices',
    headRef: 'cursor/agenturos-controller-task-d2b8',
    baseRef: 'cursor/agenturos-controller-task-e04c',
    tipSha: '02b6094',
  },
  {
    number: 42,
    title: 'Add usable privacy-safe Kfz funnel breakdowns',
    headRef: 'cursor/agenturos-controller-task-a5b3',
    baseRef: 'cursor/agenturos-controller-task-d2b8',
    tipSha: '5e74416',
  },
  {
    number: 44,
    title: 'Add internal Kfz launch-readiness checklist',
    headRef: 'cursor/agenturos-controller-task-097a',
    baseRef: 'cursor/agenturos-controller-task-a5b3',
    tipSha: 'f8a996d',
  },
  {
    number: 45,
    title: 'Store Kfz landing documents in a private Supabase bucket',
    headRef: 'cursor/agenturos-controller-task-5cb3',
    baseRef: 'cursor/agenturos-controller-task-097a',
    tipSha: 'b8404a5',
  },
  {
    number: 46,
    title: 'Add secret-safe Kfz Supabase configuration preflight',
    headRef: 'cursor/agenturos-controller-task-792b',
    baseRef: 'cursor/agenturos-controller-task-5cb3',
    tipSha: '5b915fd',
  },
  {
    number: 47,
    title: 'Repair Vercel Preview Supabase boot and public /kfz route',
    headRef: 'cursor/agenturos-controller-task-9bc0',
    baseRef: 'cursor/agenturos-controller-task-792b',
    tipSha: '988fbcb',
  },
  {
    number: 48,
    title: 'Add Kfz release-candidate end-to-end acceptance harness',
    headRef: 'cursor/agenturos-controller-task-75b0',
    baseRef: 'cursor/agenturos-controller-task-9bc0',
    tipSha: 'd5796e0',
  },
  {
    number: 49,
    title: 'Improve privacy-safe Kfz funnel analytics review',
    headRef: 'cursor/agenturos-controller-task-32b5',
    baseRef: 'cursor/agenturos-controller-task-75b0',
    tipSha: 'ce68edb',
  },
  {
    number: 50,
    title: 'Harden Kfz analytics consent and data-quality guardrails',
    headRef: 'cursor/agenturos-controller-task-9908',
    baseRef: 'cursor/agenturos-controller-task-32b5',
    tipSha: '58fe486',
  },
  {
    number: 51,
    title: 'Give the Kfz readiness screen one secret-safe launch answer',
    headRef: 'cursor/agenturos-controller-task-13c0',
    baseRef: 'cursor/agenturos-controller-task-9908',
    tipSha: '3579399',
  },
  {
    number: 52,
    title: 'Add privacy-safe Kfz period, source and branch comparisons',
    headRef: 'cursor/agenturos-controller-task-c46d',
    baseRef: 'cursor/agenturos-controller-task-13c0',
    tipSha: '814b350',
  },
  {
    number: 53,
    title: 'Harden the privacy-safe Kfz analytics persistence contract',
    headRef: 'cursor/agenturos-controller-task-4e4f',
    baseRef: 'cursor/agenturos-controller-task-c46d',
    tipSha: 'b70e5ce',
  },
  {
    number: 54,
    title: 'Dry-run the complete Kfz Supabase migration chain',
    headRef: KFZ_RELEASE_HANDOFF_BASE_BRANCH,
    baseRef: 'cursor/agenturos-controller-task-4e4f',
    tipSha: 'f4ff667',
  },
]

export const KFZ_RELEASE_REQUIRED_MIGRATIONS: readonly KfzReleaseMigrationStep[] = [
  {
    file: 'supabase/migrations/20260906120000_inbox_website_channel_source.sql',
    purpose: 'inbox_items channel/source website',
    introducingSha: '667ac45',
    introducingPr: KFZ_RELEASE_PARALLEL_GATE2_PR,
    introducingPrNote:
      'Commit is in this stack history (base 52f4). PR #19 is a parallel open PR on master with the same Gate-2 commits — do not merge it as a second history.',
  },
  {
    file: 'supabase/migrations/20260909140000_kfz_funnel_analytics_events.sql',
    purpose: 'kfz_funnel_analytics_events',
    introducingSha: '55417c6',
    introducingPr: 40,
    introducingPrNote: 'Stacked PR #40 on this branch.',
  },
  {
    file: 'supabase/migrations/20260910120000_kfz_inbound_documents_bucket.sql',
    purpose: 'kfz-inbound-documents private bucket',
    introducingSha: '3d95a04',
    introducingPr: 45,
    introducingPrNote: 'Stacked PR #45 on this branch.',
  },
  {
    file: 'supabase/migrations/20260911120000_kfz_funnel_analytics_persistence_contract.sql',
    purpose: 'kfz_funnel_analytics_events persistence allow-list and RLS',
    introducingSha: 'b70e5ce',
    introducingPr: 53,
    introducingPrNote: 'Stacked PR #53 on this branch.',
  },
]

export const KFZ_RELEASE_REQUIRED_ROUTES: readonly KfzReleaseRoute[] = [
  { href: '/kfz', file: 'src/app/kfz/page.tsx' },
  { href: '/app/inbox', file: 'src/app/app/inbox/page.tsx' },
  { href: '/app/inbox/kfz-document', file: 'src/app/app/inbox/kfz-document/route.ts' },
  { href: '/app/kfz-analytics', file: 'src/app/app/kfz-analytics/page.tsx' },
  { href: '/app/kfz-readiness', file: 'src/app/app/kfz-readiness/page.tsx' },
  { href: '/api/inbound/kfz', file: 'src/app/api/inbound/kfz/route.ts' },
  { href: '/api/inbound/kfz-analytics', file: 'src/app/api/inbound/kfz-analytics/route.ts' },
]

export const KFZ_RELEASE_ENV_NAMES: readonly KfzReleaseEnvName[] = [
  { name: 'INBOUND_KFZ_INTAKE_SECRET', required: true },
  {
    name: 'INBOUND_KFZ_AGENCY_ID',
    fallbackName: 'INBOUND_EMAIL_AGENCY_ID',
    required: true,
  },
  {
    name: 'INBOUND_KFZ_ACTOR_USER_ID',
    fallbackName: 'INBOUND_EMAIL_ACTOR_USER_ID',
    required: true,
  },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true },
  {
    name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    fallbackName: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
  },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true },
  { name: 'INBOUND_KFZ_RATE_LIMIT_MAX', required: false },
  { name: 'INBOUND_KFZ_RATE_LIMIT_WINDOW_MS', required: false },
]

export const KFZ_RELEASE_COMMANDS: readonly KfzReleaseCommand[] = [
  { command: 'npm run test:inbound', actor: 'automated' },
  { command: 'npx tsc --noEmit', actor: 'automated' },
  { command: 'npm run lint', actor: 'automated' },
  { command: 'npm run build', actor: 'automated' },
  { command: 'npm run preflight:kfz-supabase', actor: 'automated' },
]

export const KFZ_RELEASE_READINESS_CHECK_IDS = [
  'questionnaire',
  'public_configuration',
  'migrations',
  'private_documents',
  'submission_persistence',
  'inbox_item_creation',
  'authorized_review',
  'analytics',
] as const

export const KFZ_RELEASE_OWNER_STEPS: readonly KfzReleaseOwnerStep[] = [
  {
    id: 'merge-stack-in-order',
    label:
      'Stacked PRs in merge-first order mergen (#22 → #54). Dieses Handoff merget nichts. PR #19 nicht als zweite Historie mergen.',
  },
  {
    id: 'vercel-env-values',
    label:
      'Im bestehenden Vercel-Projekt die Pflichtnamen setzen. Werte bleiben in Vercel und werden hier nicht angezeigt. Kein NEXT_PUBLIC_ für SUPABASE_SERVICE_ROLE_KEY oder INBOUND_KFZ_INTAKE_SECRET.',
  },
  {
    id: 'apply-migrations',
    label:
      'Im bestehenden Supabase-Projekt die vier SQL-Dateien in Timestamp-Reihenfolge anwenden. Dieser Slice wendet nichts an. Kein neues Projekt, kein DROP.',
  },
  {
    id: 'confirm-private-bucket',
    label:
      'Bucket-Name kfz-inbound-documents: public=false, keine anon/authenticated Policies, kein öffentlicher Link, kein Client-Upload.',
  },
  {
    id: 'vercel-redeploy',
    label:
      'Bestehendes Vercel-Projekt nach Env- und Migrations-Schritten neu deployen. Kein neues Projekt, kein Paid Add-on.',
  },
  {
    id: 'domain-legal-campaign',
    label:
      'Domain-Mapping auf /kfz, Rechtstext/Retention und Kampagne bleiben Owner. Kein Meta/WhatsApp-API, kein automatischer Kundenkontakt.',
  },
]

export const KFZ_RELEASE_PREVIEW_CHECKS: readonly KfzReleasePreviewCheck[] = [
  {
    id: 'local-readiness',
    label:
      'Lokal /dev/kfz-readiness: Handoff sichtbar, productionClaim=false, keine Secret-Werte.',
  },
  {
    id: 'local-landing',
    label:
      'Lokal /kfz: sechs Startzweige und Anfrage-Consent. Kein Sofortpreis, kein automatischer Versand.',
  },
  {
    id: 'local-inbox-review',
    label:
      'Lokal /app/inbox und /app/inbox/kfz-document: autorisierte Prüfung, anonym/fremd 401/404. Keine Object-Keys in der UI-Behauptung dieses Handoffs.',
  },
  {
    id: 'local-analytics',
    label:
      'Lokal /app/kfz-analytics oder /dev/kfz-analytics: nur Metadaten (Quelle, Besuch, Zweig, Schritt, Stopp, Timing, Submit).',
  },
  {
    id: 'vercel-preview-readonly',
    label:
      'Vercel Preview nur lesen. SSO-Redirect ist UNKNOWN, kein Production-Beweis. Kein Env-Write, kein Deploy, kein DB-Apply.',
  },
]

export const KFZ_RELEASE_STOP_CONDITIONS: readonly KfzReleaseStopCondition[] = [
  {
    id: 'out-of-order-merge',
    label: 'Stopp, wenn ein Stack-PR auf die falsche Base gemerged würde.',
  },
  {
    id: 'checks-failed',
    label:
      'Stopp, wenn npm run test:inbound, npx tsc --noEmit, npm run lint oder npm run build fehlschlägt.',
  },
  {
    id: 'dry-run-failed',
    label:
      'Stopp, wenn die In-Memory-Migrationskette nicht ok ist. Kein Remote-Apply.',
  },
  {
    id: 'public-bucket',
    label:
      'Stopp, wenn die Bucket-Migration public=true setzt oder anon/authenticated Policies vergibt.',
  },
  {
    id: 'missing-env-names',
    label:
      'Stopp, wenn preflight:kfz-supabase Pflichtnamen als missing meldet. Werte nicht lesen.',
  },
  {
    id: 'readiness-blocked',
    label: 'Stopp, wenn /app/kfz-readiness BLOCKED ist.',
  },
  {
    id: 'apply-error',
    label:
      'Stopp beim ersten SQL-Fehler. Restliche Dateien warten. Kein DROP, keine destruktive Down-Migration in diesem Slice.',
  },
  {
    id: 'parallel-gate2',
    label:
      'Stopp, wenn PR #19 unabhängig von diesem Stack auf master gemerged würde (zweite Historie).',
  },
  {
    id: 'secret-print',
    label:
      'Stopp, wenn Secret-Werte, Antworten, Kunden-Dateinamen, Object-Keys oder Personenbezüge ausgegeben würden.',
  },
]

export const KFZ_RELEASE_PRESERVED_SURFACES = [
  'six_kfz_branches',
  'questionnaire',
  'consent',
  'analytics',
  'private_storage',
  'inbox',
  'authorized_review',
] as const

function resolveHandoffRepoRoot(cwd: string = process.cwd()): string {
  if (fs.existsSync(path.join(cwd, 'src', 'app', 'kfz', 'page.tsx'))) {
    return cwd
  }
  const fromHere = path.resolve(cwd, '..')
  if (fs.existsSync(path.join(fromHere, 'src', 'app', 'kfz', 'page.tsx'))) {
    return fromHere
  }
  return cwd
}

function readRepoFile(repoRoot: string, relative: string): string | null {
  const full = path.join(repoRoot, relative)
  if (!fs.existsSync(full)) {
    return null
  }
  return fs.readFileSync(full, 'utf8')
}

export function kfzReleaseStackedPrNumbers(): number[] {
  return KFZ_RELEASE_STACKED_PRS.map((entry) => entry.number)
}

export function kfzReleaseMigrationFiles(): string[] {
  return KFZ_RELEASE_REQUIRED_MIGRATIONS.map((entry) => entry.file)
}

export function kfzReleaseAutomatedCommands(): string[] {
  return KFZ_RELEASE_COMMANDS.filter((entry) => entry.actor === 'automated').map(
    (entry) => entry.command,
  )
}

export function kfzReleaseStackIsLinear(): boolean {
  for (let index = 1; index < KFZ_RELEASE_STACKED_PRS.length; index += 1) {
    const previous = KFZ_RELEASE_STACKED_PRS[index - 1]
    const current = KFZ_RELEASE_STACKED_PRS[index]
    if (!previous || !current) {
      return false
    }
    if (current.baseRef !== previous.headRef) {
      return false
    }
  }
  const first = KFZ_RELEASE_STACKED_PRS[0]
  const last = KFZ_RELEASE_STACKED_PRS[KFZ_RELEASE_STACKED_PRS.length - 1]
  return (
    first?.baseRef === KFZ_RELEASE_STACK_BASE_BRANCH &&
    last?.number === KFZ_RELEASE_HANDOFF_BASE_PR &&
    last.headRef === KFZ_RELEASE_HANDOFF_BASE_BRANCH
  )
}

export function kfzReleaseMigrationsAreTimestampOrdered(): boolean {
  const files = kfzReleaseMigrationFiles()
  const names = files.map((file) => path.basename(file))
  const sorted = [...names].sort()
  return (
    names.length === 4 &&
    names.every((name, index) => name === sorted[index]) &&
    names.every((name) => /^\d{14}_.+\.sql$/.test(name))
  )
}

export function renderKfzReleaseHandoffMarkdown(): string {
  const stackLines = KFZ_RELEASE_STACKED_PRS.map(
    (entry, index) =>
      `${index + 1}. PR #${entry.number} \`${entry.headRef}\` ← \`${entry.baseRef}\` @ \`${entry.tipSha}\` — ${entry.title}`,
  )
  const migrationLines = KFZ_RELEASE_REQUIRED_MIGRATIONS.map(
    (entry, index) =>
      `${index + 1}. \`${entry.file}\` — ${entry.purpose}. Introducing commit \`${entry.introducingSha}\` (PR #${entry.introducingPr}). ${entry.introducingPrNote}`,
  )
  const envLines = KFZ_RELEASE_ENV_NAMES.map((entry) => {
    const fallback = entry.fallbackName ? ` (fallback \`${entry.fallbackName}\`)` : ''
    const req = entry.required ? 'required' : 'optional'
    return `- \`${entry.name}\`${fallback} — ${req}`
  })
  const commandLines = KFZ_RELEASE_COMMANDS.map(
    (entry) => `- \`${entry.command}\` — ${entry.actor}`,
  )
  const checkLines = KFZ_RELEASE_READINESS_CHECK_IDS.map((id) => `- \`${id}\``)
  const ownerLines = KFZ_RELEASE_OWNER_STEPS.map(
    (entry) => `- ${entry.id}: ${entry.label}`,
  )
  const previewLines = KFZ_RELEASE_PREVIEW_CHECKS.map(
    (entry) => `- ${entry.id}: ${entry.label}`,
  )
  const stopLines = KFZ_RELEASE_STOP_CONDITIONS.map(
    (entry) => `- ${entry.id}: ${entry.label}`,
  )
  const routeLines = KFZ_RELEASE_REQUIRED_ROUTES.map(
    (entry) => `- \`${entry.href}\` ← \`${entry.file}\``,
  )
  const preservedLines = KFZ_RELEASE_PRESERVED_SURFACES.map((entry) => `- ${entry}`)

  return [
    '# Kfz release handoff',
    '',
    KFZ_RELEASE_HANDOFF_HEADLINE,
    '',
    KFZ_RELEASE_HANDOFF_DISCLAIMER,
    '',
    `Branch: \`${KFZ_RELEASE_HANDOFF_BRANCH}\` from \`${KFZ_RELEASE_HANDOFF_BASE_BRANCH}\` (PR #${KFZ_RELEASE_HANDOFF_BASE_PR}).`,
    '',
    '## 1. Stacked PR dependency (merge-first)',
    '',
    `Stack base (no open PR): \`${KFZ_RELEASE_STACK_BASE_BRANCH}\` @ \`${KFZ_RELEASE_STACK_BASE_SHA}\`. Contains Gate-2 plus review/triage history, including website-channel migration \`${KFZ_RELEASE_REQUIRED_MIGRATIONS[0]?.introducingSha}\`.`,
    '',
    `Parallel open PR #${KFZ_RELEASE_PARALLEL_GATE2_PR} (\`${KFZ_RELEASE_PARALLEL_GATE2_HEAD}\` ← master) shares those Gate-2 commits. Do not merge it as a second history.`,
    '',
    'Merge order (bottom first). This document does not merge:',
    '',
    ...stackLines,
    '',
    '## 2. Required migrations (Owner apply only)',
    '',
    'Checked-in order equals SQL timestamps. Additive / IF NOT EXISTS / ON CONFLICT. In-memory dry-run is automated. Remote apply is Owner.',
    '',
    ...migrationLines,
    '',
    '## 3. Environment variable names (no values)',
    '',
    ...envLines,
    '',
    '## 4. Automated / tested commands',
    '',
    ...commandLines,
    '',
    'Expected readiness checks (local contract, not production approval):',
    '',
    ...checkLines,
    '',
    '## 5. Owner-only steps (do not perform here)',
    '',
    ...ownerLines,
    '',
    '## 6. Preview checks (read-only)',
    '',
    ...previewLines,
    '',
    '## 7. Rollback-safe stop conditions',
    '',
    ...stopLines,
    '',
    '## 8. Preserved surfaces and routes',
    '',
    ...preservedLines,
    '',
    ...routeLines,
    '',
    `Document path: \`${KFZ_RELEASE_HANDOFF_DOC}\`. Surface: \`/app/kfz-readiness\` (local preview \`/dev/kfz-readiness\`).`,
    '',
  ].join('\n')
}

export function inspectKfzReleaseHandoff(
  repoRoot: string = resolveHandoffRepoRoot(),
): KfzReleaseHandoffSurface {
  const relative = KFZ_RELEASE_HANDOFF_DOC
  const rendered = renderKfzReleaseHandoffMarkdown()
  const onDisk = readRepoFile(repoRoot, relative)
  const present = onDisk !== null
  const matchesRenderer = onDisk === rendered
  const migrationsMatch =
    kfzReleaseMigrationsAreTimestampOrdered() &&
    KFZ_RELEASE_REQUIRED_MIGRATIONS.every((entry) =>
      fs.existsSync(path.join(repoRoot, entry.file)),
    ) &&
    present &&
    KFZ_RELEASE_REQUIRED_MIGRATIONS.every((entry) => onDisk.includes(path.basename(entry.file))) &&
    migrationBasenamesAppearInOrder(onDisk)
  const routesMatch = KFZ_RELEASE_REQUIRED_ROUTES.every((route) => {
    const fileOk = fs.existsSync(path.join(repoRoot, route.file))
    const listed = Boolean(onDisk?.includes(route.href) && onDisk.includes(route.file))
    return fileOk && listed
  })
  const ok =
    present &&
    matchesRenderer &&
    migrationsMatch &&
    routesMatch &&
    kfzReleaseStackIsLinear()

  return {
    documentPath: relative,
    present,
    matchesRenderer,
    migrationsMatch,
    routesMatch,
    stackPrNumbers: kfzReleaseStackedPrNumbers(),
    migrationFiles: kfzReleaseMigrationFiles(),
    automatedCommands: kfzReleaseAutomatedCommands(),
    ownerStepIds: KFZ_RELEASE_OWNER_STEPS.map((entry) => entry.id),
    stopConditionIds: KFZ_RELEASE_STOP_CONDITIONS.map((entry) => entry.id),
    status: ok ? 'PASS' : 'BLOCKED',
  }
}

function migrationBasenamesAppearInOrder(markdown: string): boolean {
  let cursor = 0
  for (const entry of KFZ_RELEASE_REQUIRED_MIGRATIONS) {
    const name = path.basename(entry.file)
    const found = markdown.indexOf(name, cursor)
    if (found < 0) {
      return false
    }
    cursor = found + name.length
  }
  return true
}

const FORBIDDEN_HANDOFF_PATTERNS = [
  /eyJ[A-Za-z0-9_-]{8,}/,
  /Bearer\s+\S+/i,
  /[A-Z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
  /\+\d{8,}/,
  /\b\d{5}\s+\d{6,}\b/,
  /\.(pdf|jpe?g|png|webp|heic)\b/i,
  /Mustermann|Beispielversicherung|Anna Beispiel|synthetic\.pdf/i,
  /kfz\/[0-9a-f-]{36}\/[0-9a-f-]{36}/i,
]

export function listKfzReleaseHandoffForbiddenMatches(text: string): string[] {
  const hits: string[] = []
  for (const pattern of FORBIDDEN_HANDOFF_PATTERNS) {
    const match = pattern.exec(text)
    if (match?.[0]) {
      hits.push(match[0])
    }
  }
  return hits
}

export function kfzReleaseHandoffContainsForbiddenValue(
  text: string,
  env: Record<string, string | undefined> = {},
): boolean {
  if (listKfzReleaseHandoffForbiddenMatches(text).length > 0) {
    return true
  }
  for (const value of Object.values(env)) {
    const trimmed = value?.trim() ?? ''
    if (trimmed.length >= 8 && text.includes(trimmed)) {
      return true
    }
  }
  return false
}
