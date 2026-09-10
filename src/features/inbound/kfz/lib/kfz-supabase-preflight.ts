/**
 * Deterministic preflight for the private Kfz Supabase document-storage
 * integration. Inspects checked-in names, migrations and server-only
 * service-role usage. It never prints secret values, never applies
 * migrations, and never talks to Production.
 */

import fs from 'node:fs'
import path from 'node:path'

import {
  isKfzSupabasePersistConfigured,
  isNamedEnvPresent,
  kfzSupabasePersistFailClosed,
  KFZ_SUPABASE_PERSIST_ENV_NAMES,
  KFZ_SUPABASE_PERSIST_MISSING_ERROR,
  snapshotKfzSupabasePersistEnv,
  type KfzSupabaseEnvSource,
} from '@/features/inbound/kfz/lib/kfz-supabase-persist-env'
import { KFZ_LANDING_MAX_DOCUMENT_BYTES } from '@/features/inbound/kfz/lib/kfz-landing-documents'
import { KFZ_LANDING_BRANCHES } from '@/features/inbound/kfz/lib/kfz-questionnaire'
import { KFZ_INBOUND_DOCUMENTS_BUCKET } from '@/features/inbound/kfz/types/kfz-document-storage'
import type {
  KfzSupabaseOwnerChecklistStep,
  KfzSupabasePreflightCheck,
  KfzSupabasePreflightCounts,
  KfzSupabasePreflightEnvPresence,
  KfzSupabasePreflightReport,
  KfzSupabasePreflightStatus,
} from '@/features/inbound/kfz/types/kfz-supabase-preflight'

export const KFZ_SUPABASE_PREFLIGHT_COMMAND = 'preflight:kfz-supabase' as const

export const KFZ_SUPABASE_PREFLIGHT_DISCLAIMER =
  'Keine Produktionsfreigabe. Dieser Preflight prüft den lokalen Code-Vertrag und ob Pflichtnamen in diesem Prozess gesetzt sind. Werte werden nicht angezeigt. Migrationen werden nicht angewendet. Es gibt keinen Deploy und keinen Production-Zugriff.'

export const KFZ_SUPABASE_PREFLIGHT_HEADLINE =
  'Kfz Supabase-Konfiguration · Preflight ohne Secrets'

export const KFZ_SUPABASE_DOCUMENTS_MIGRATION =
  'supabase/migrations/20260910120000_kfz_inbound_documents_bucket.sql' as const

export const KFZ_SUPABASE_RELATED_MIGRATIONS = [
  'supabase/migrations/20260906120000_inbox_website_channel_source.sql',
  'supabase/migrations/20260909140000_kfz_funnel_analytics_events.sql',
  KFZ_SUPABASE_DOCUMENTS_MIGRATION,
] as const

export const KFZ_SUPABASE_SERVICE_ROLE_ALLOWLIST = [
  'src/features/inbound/kfz/repositories/kfz-document-store.ts',
  'src/features/inbound/kfz/repositories/kfz-analytics-store.ts',
  'src/features/inbound/repositories/inbound-intake-store.ts',
  'src/features/inbound/kfz/lib/kfz-launch-readiness.ts',
  'src/features/inbound/kfz/lib/kfz-supabase-persist-env.ts',
  'src/features/inbound/kfz/lib/kfz-supabase-preflight.ts',
  'src/features/inbound/kfz/bin/run-kfz-supabase-preflight.ts',
  'src/features/inbound/kfz/kfz-launch-readiness.smoke.test.ts',
  'src/features/inbound/kfz/kfz-supabase-preflight.smoke.test.ts',
] as const

const SECRET_NAME_PATTERN = /SECRET|SERVICE_ROLE|TOKEN|PASSWORD|PRIVATE_KEY|_KEY$/i

const HIDDEN_ENV_NAMES = [
  ...KFZ_SUPABASE_PERSIST_ENV_NAMES,
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'INBOUND_KFZ_INTAKE_SECRET',
  'INBOUND_KFZ_AGENCY_ID',
  'INBOUND_KFZ_ACTOR_USER_ID',
  'INBOUND_EMAIL_AGENCY_ID',
  'INBOUND_EMAIL_ACTOR_USER_ID',
] as const

export const KFZ_SUPABASE_OWNER_CHECKLIST: readonly KfzSupabaseOwnerChecklistStep[] = [
  {
    id: 'supabase-apply-migrations',
    tool: 'Supabase',
    instruction:
      'Im bestehenden Supabase-Projekt (SQL Editor oder das bereits genutzte CLI-Projekt) die eingecheckten Dateien in dieser Reihenfolge anwenden: supabase/migrations/20260906120000_inbox_website_channel_source.sql, supabase/migrations/20260909140000_kfz_funnel_analytics_events.sql, supabase/migrations/20260910120000_kfz_inbound_documents_bucket.sql. Dieser Command wendet nichts an. Kein neues Supabase-Projekt, kein neues Paid-Add-on.',
  },
  {
    id: 'supabase-confirm-private-bucket',
    tool: 'Supabase',
    instruction:
      'Storage: Bucket-Name kfz-inbound-documents existiert. Public ist aus. Keine Policies für anon oder authenticated auf diesem Bucket. Kein öffentlicher Link und kein Client-Upload.',
  },
  {
    id: 'vercel-env-names',
    tool: 'Vercel',
    instruction:
      'Im bestehenden Vercel-Projekt unter Settings → Environment Variables genau diese Namen setzen. Werte bleiben in Vercel und werden hier nicht angezeigt: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (älterer Name NEXT_PUBLIC_SUPABASE_ANON_KEY nur als Fallback), SUPABASE_SERVICE_ROLE_KEY (niemals als NEXT_PUBLIC_), INBOUND_KFZ_INTAKE_SECRET, INBOUND_KFZ_AGENCY_ID, INBOUND_KFZ_ACTOR_USER_ID. Optional: INBOUND_KFZ_RATE_LIMIT_MAX, INBOUND_KFZ_RATE_LIMIT_WINDOW_MS.',
  },
  {
    id: 'vercel-redeploy',
    tool: 'Vercel',
    instruction:
      'Bestehendes Vercel-Projekt nach dem Speichern der Variablen neu deployen. Kein neues Vercel-Projekt, kein neuer Paid Service, kein Production-Apply und kein Secret-Paste in Chat oder Logs.',
  },
]

const REQUIRED_BRANCH_IDS = [
  'upload_documents',
  'no_documents',
  'first_car',
  'additional_car',
  'switch_car',
  'evb',
] as const

export function resolveKfzSupabasePreflightRepoRoot(
  cwd: string = process.cwd(),
): string {
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

function listSourceFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return acc
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') {
      continue
    }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      listSourceFiles(full, acc)
      continue
    }
    if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      acc.push(full)
    }
  }
  return acc
}

export function inspectKfzServiceRoleUsage(repoRoot: string): {
  ok: boolean
  leaked: string[]
} {
  const srcRoot = path.join(repoRoot, 'src')
  const leaked: string[] = []
  const allow = new Set<string>(KFZ_SUPABASE_SERVICE_ROLE_ALLOWLIST)

  for (const file of listSourceFiles(srcRoot)) {
    const relative = path.relative(repoRoot, file).split(path.sep).join('/')
    if (allow.has(relative)) {
      continue
    }
    const source = fs.readFileSync(file, 'utf8')
    const hasServiceRoleName = source.includes('SUPABASE_SERVICE_ROLE_KEY')
    const hasForbiddenPublicName = source.includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE')
    const isClientModule =
      relative.includes('/components/') ||
      relative === 'src/lib/supabase/client.ts' ||
      /^\s*['"]use client['"]/m.test(source)

    if (hasForbiddenPublicName || (hasServiceRoleName && isClientModule) || hasServiceRoleName) {
      leaked.push(relative)
    }
  }

  return { ok: leaked.length === 0, leaked }
}

export function inspectKfzPrivateBucketMigration(repoRoot: string): {
  ok: boolean
  detail: string
} {
  const sql = readRepoFile(repoRoot, KFZ_SUPABASE_DOCUMENTS_MIGRATION)
  if (!sql) {
    return {
      ok: false,
      detail: `${KFZ_SUPABASE_DOCUMENTS_MIGRATION} fehlt im Repository.`,
    }
  }

  const hasBucket = sql.includes(`'${KFZ_INBOUND_DOCUMENTS_BUCKET}'`)
  const privateFlag = /public\s*,/.test(sql) && /false/.test(sql) && !/public\s*=\s*true/.test(sql)
  const noClientPolicies = !/to anon/i.test(sql) && !/to authenticated/i.test(sql)
  const serviceRole = /service_role/.test(sql)
  const sizeLimit = sql.includes(String(KFZ_LANDING_MAX_DOCUMENT_BYTES))
  const noPublicUrl = !/getPublicUrl|signedUrl/i.test(sql)

  const ok =
    hasBucket && privateFlag && noClientPolicies && serviceRole && sizeLimit && noPublicUrl

  return {
    ok,
    detail: ok
      ? `Migration ${KFZ_SUPABASE_DOCUMENTS_MIGRATION} prüft privaten Bucket ${KFZ_INBOUND_DOCUMENTS_BUCKET} (public=false, kein anon/authenticated, service_role). Apply bleibt Owner.`
      : `Private-Bucket-Vertrag in ${KFZ_SUPABASE_DOCUMENTS_MIGRATION} ist unvollständig.`,
  }
}

function inspectFailClosedSources(repoRoot: string): boolean {
  const persist = readRepoFile(repoRoot, 'src/features/inbound/kfz/lib/kfz-supabase-persist-env.ts')
  const store = readRepoFile(repoRoot, 'src/features/inbound/kfz/repositories/kfz-document-store.ts')
  const http = readRepoFile(repoRoot, 'src/features/inbound/kfz/services/handle-kfz-inbound-http.ts')
  const review = readRepoFile(repoRoot, 'src/app/app/inbox/kfz-document/route.ts')
  const session = readRepoFile(repoRoot, 'src/features/inbound/kfz/lib/kfz-document-storage.ts')
  if (!persist || !store || !http || !review || !session) {
    return false
  }
  return (
    persist.includes(KFZ_SUPABASE_PERSIST_MISSING_ERROR) &&
    store.includes('kfzSupabasePersistFailClosed') &&
    store.includes('KFZ_SUPABASE_PERSIST_MISSING_ERROR') &&
    http.includes('store_unavailable') &&
    http.includes('503') &&
    review.includes('401') &&
    session.includes('fail closed') &&
    session.includes('401')
  )
}

function inspectReviewAuthz(repoRoot: string): boolean {
  const source = readRepoFile(repoRoot, 'src/features/inbound/kfz/lib/kfz-document-storage.ts')
  return Boolean(
    source &&
      source.includes('authorizeKfzDocumentReview') &&
      source.includes('KFZ_DOCUMENT_UNAUTHENTICATED_ERROR') &&
      source.includes('status: 401') &&
      source.includes('status: 404') &&
      source.includes('cross-item'),
  )
}

function inspectExactOnce(repoRoot: string): boolean {
  const processFile = readRepoFile(
    repoRoot,
    'src/features/inbound/kfz/services/process-kfz-inquiry.ts',
  )
  const session = readRepoFile(
    repoRoot,
    'src/features/inbound/kfz/lib/kfz-landing-submit-session.ts',
  )
  return Boolean(
    processFile &&
      session &&
      processFile.includes('deduplicated') &&
      session.includes('submissionId'),
  )
}

function inspectAnalyticsPrivacy(repoRoot: string): boolean {
  const redact = readRepoFile(repoRoot, 'src/features/inbound/kfz/lib/kfz-analytics-redact.ts')
  const boundary = readRepoFile(
    repoRoot,
    'src/features/inbound/kfz/lib/kfz-analytics-privacy-boundary.ts',
  )
  return Boolean(
    redact &&
      boundary &&
      redact.includes("'filename'") &&
      redact.includes("'objectkey'") &&
      redact.includes("'answer'") &&
      boundary.includes('file names') &&
      boundary.includes('object keys'),
  )
}

function sixBranchesOk(): boolean {
  const ids = KFZ_LANDING_BRANCHES.map((branch) => branch.id)
  return (
    KFZ_LANDING_BRANCHES.length === 6 &&
    REQUIRED_BRANCH_IDS.every((id, index) => ids[index] === id)
  )
}

function relatedMigrationsPresent(repoRoot: string): boolean {
  return KFZ_SUPABASE_RELATED_MIGRATIONS.every((file) =>
    fs.existsSync(path.join(repoRoot, file)),
  )
}

function snapshotRequiredEnv(env: KfzSupabaseEnvSource): KfzSupabasePreflightEnvPresence[] {
  return [
    ...snapshotKfzSupabasePersistEnv(env).map((entry) => ({
      name: entry.name,
      present: entry.present,
      required: true,
    })),
    {
      name: 'INBOUND_KFZ_INTAKE_SECRET',
      present: isNamedEnvPresent('INBOUND_KFZ_INTAKE_SECRET', env),
      required: true,
    },
    {
      name: 'INBOUND_KFZ_AGENCY_ID',
      present:
        isNamedEnvPresent('INBOUND_KFZ_AGENCY_ID', env) ||
        isNamedEnvPresent('INBOUND_EMAIL_AGENCY_ID', env),
      required: true,
    },
    {
      name: 'INBOUND_KFZ_ACTOR_USER_ID',
      present:
        isNamedEnvPresent('INBOUND_KFZ_ACTOR_USER_ID', env) ||
        isNamedEnvPresent('INBOUND_EMAIL_ACTOR_USER_ID', env),
      required: true,
    },
  ]
}

function countChecks(checks: readonly KfzSupabasePreflightCheck[]): KfzSupabasePreflightCounts {
  const counts: KfzSupabasePreflightCounts = {
    pass: 0,
    blocked: 0,
    ownerInput: 0,
    notVerified: 0,
  }
  for (const check of checks) {
    if (check.status === 'PASS') counts.pass += 1
    if (check.status === 'BLOCKED') counts.blocked += 1
    if (check.status === 'OWNER_INPUT') counts.ownerInput += 1
    if (check.status === 'NOT_VERIFIED') counts.notVerified += 1
  }
  return counts
}

function check(
  id: string,
  label: string,
  kind: KfzSupabasePreflightCheck['kind'],
  status: KfzSupabasePreflightStatus,
  detail: string,
): KfzSupabasePreflightCheck {
  return { id, label, kind, status, detail }
}

export function evaluateKfzSupabasePreflight(input: {
  nowIso?: string
  env?: KfzSupabaseEnvSource
  repoRoot?: string
} = {}): KfzSupabasePreflightReport {
  const env = input.env ?? process.env
  const repoRoot = input.repoRoot ?? resolveKfzSupabasePreflightRepoRoot()
  const envSnapshot = snapshotRequiredEnv(env)
  const persistConfigured = isKfzSupabasePersistConfigured(env)
  const failClosed = kfzSupabasePersistFailClosed(env)
  const bucket = inspectKfzPrivateBucketMigration(repoRoot)
  const serviceRole = inspectKfzServiceRoleUsage(repoRoot)
  const failClosedSources = inspectFailClosedSources(repoRoot)
  const reviewOk = inspectReviewAuthz(repoRoot)
  const exactOnceOk = inspectExactOnce(repoRoot)
  const analyticsOk = inspectAnalyticsPrivacy(repoRoot)
  const branchesOk = sixBranchesOk()
  const migrationsOk = relatedMigrationsPresent(repoRoot)
  const missingPersist = envSnapshot
    .filter((entry) => entry.required && !entry.present && KFZ_SUPABASE_PERSIST_ENV_NAMES.includes(entry.name as (typeof KFZ_SUPABASE_PERSIST_ENV_NAMES)[number]))
    .map((entry) => entry.name)

  const failClosedOk = failClosedSources && (persistConfigured || failClosed.allowsStore === false)

  const checks: KfzSupabasePreflightCheck[] = [
    check(
      'required_env_names',
      'Pflichtnamen für Supabase-Persistenz',
      'runtime',
      persistConfigured ? 'PASS' : 'BLOCKED',
      persistConfigured
        ? 'NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY sind in diesem Prozess gesetzt. Werte werden nicht angezeigt.'
        : `In diesem Prozess fehlen: ${missingPersist.join(', ') || 'NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'}. Live-Persistenz aus diesem Prozess ist blockiert.`,
    ),
    check(
      'private_bucket_migration',
      'Privater Bucket und Migration sind eingecheckt',
      'contract',
      bucket.ok && migrationsOk ? 'PASS' : 'BLOCKED',
      bucket.ok && migrationsOk
        ? bucket.detail
        : bucket.ok
          ? 'Mindestens eine verwandte Kfz-Migration fehlt im Repository.'
          : bucket.detail,
    ),
    check(
      'server_only_service_role',
      'Service-Role nur serverseitig',
      'contract',
      serviceRole.ok ? 'PASS' : 'BLOCKED',
      serviceRole.ok
        ? 'SUPABASE_SERVICE_ROLE_KEY kommt nur in erlaubten Server-/Preflight-Dateien vor. Kein NEXT_PUBLIC_ für die Service-Role. Client-Bundle bleibt ohne Key.'
        : `Service-Role-Name außerhalb der Server-Allowlist: ${serviceRole.leaked.join(', ')}.`,
    ),
    check(
      'fail_closed',
      'Fail-closed ohne Persistenz-Namen',
      'contract',
      failClosedOk ? 'PASS' : 'BLOCKED',
      failClosedOk
        ? `Fehlende Persistenz-Namen verhindern den Store (${KFZ_SUPABASE_PERSIST_MISSING_ERROR}). Intake antwortet store_unavailable/503. Review bleibt 401/404. Kein Secret im Fehlertext.`
        : 'Fail-closed-Vertrag für fehlende Supabase-Persistenz ist unvollständig.',
    ),
    check(
      'public_bucket_disabled',
      'Öffentlicher Bucket-Zugriff bleibt aus',
      'contract',
      bucket.ok ? 'PASS' : 'BLOCKED',
      bucket.ok
        ? 'Migration setzt public=false und enthält keine anon/authenticated Policies und keine public URL-Helfer.'
        : 'Öffentlicher Bucket-Zugriff ist im lokalen Vertrag nicht widerlegt.',
    ),
    check(
      'review_authz',
      'Anonyme und fremde Dokumentprüfung bleiben gesperrt',
      'contract',
      reviewOk ? 'PASS' : 'BLOCKED',
      reviewOk
        ? 'authorizeKfzDocumentReview lehnt unauthentifizierte und fremde Item-Zugriffe mit 401/404 ab. Kein öffentlicher Storage-Link.'
        : 'Review-Autorisierung ist im lokalen Vertrag nicht nachweisbar.',
    ),
    check(
      'exact_once_retry',
      'Retry bleibt exact-once',
      'contract',
      exactOnceOk ? 'PASS' : 'BLOCKED',
      exactOnceOk
        ? 'processKfzWebsiteInquiry und die Landing-Submit-Session behalten dieselbe submissionId und markieren Replay als deduplicated.'
        : 'Exact-once-Submit/Retry ist im lokalen Vertrag nicht nachweisbar.',
    ),
    check(
      'analytics_no_document_pii',
      'Analytics ohne Dateiname, Object-Key, Antworten oder Personenbezug',
      'contract',
      analyticsOk ? 'PASS' : 'BLOCKED',
      analyticsOk
        ? 'Redaction und Privacy-Grenze streichen filename, objectKey, answers und personenbezogene Felder. Declined speichert nichts.'
        : 'Analytics-Privacy-Grenze ist im lokalen Vertrag nicht nachweisbar.',
    ),
    check(
      'six_branches_preserved',
      'Sechs Kfz-Zweige bleiben erhalten',
      'contract',
      branchesOk ? 'PASS' : 'BLOCKED',
      branchesOk
        ? 'Die sechs Startzweige, Fragebogen, Consent, Inbox, Analytics und Startcheck bleiben Teil des lokalen Vertrags.'
        : 'KFZ_LANDING_BRANCHES weicht von den sechs freigegebenen Zweigen ab.',
    ),
    check(
      'owner_apply',
      'Migration anwenden und echte Umgebung setzen',
      'owner',
      'OWNER_INPUT',
      'Apply und Vercel-Variablen bleiben Owner. Dieser Preflight ändert keine Remote-Datenbank und kein Deployment. Eine Checkliste: bestehendes Supabase- und bestehendes Vercel-Projekt.',
    ),
    check(
      'production_apply_unverified',
      'Preview/Production-Apply ist lokal nicht bewiesen',
      'owner',
      'NOT_VERIFIED',
      'Ob Preview oder Production den privaten Bucket bereits hat, prüft dieser Command nicht. Kein Remote-Select, kein Storage-List, kein Secret-Read.',
    ),
  ]

  const contractOk = checks
    .filter((entry) => entry.kind === 'contract')
    .every((entry) => entry.status === 'PASS')

  return {
    generatedAt: input.nowIso ?? new Date().toISOString(),
    command: KFZ_SUPABASE_PREFLIGHT_COMMAND,
    scope: 'local_code_contract',
    productionClaim: false,
    appliesMigrations: false,
    deploys: false,
    disclaimer: KFZ_SUPABASE_PREFLIGHT_DISCLAIMER,
    headline: KFZ_SUPABASE_PREFLIGHT_HEADLINE,
    env: envSnapshot,
    checks,
    ownerChecklist: KFZ_SUPABASE_OWNER_CHECKLIST,
    counts: countChecks(checks),
    contractOk,
    thisProcessConfigured: persistConfigured,
  }
}

export function collectHiddenEnvValues(
  env: KfzSupabaseEnvSource = process.env,
): string[] {
  const values: string[] = []
  const seen = new Set<string>()
  for (const [name, value] of Object.entries(env)) {
    const trimmed = value?.trim() ?? ''
    if (trimmed.length < 8) {
      continue
    }
    const hiddenByName =
      HIDDEN_ENV_NAMES.includes(name as (typeof HIDDEN_ENV_NAMES)[number]) ||
      SECRET_NAME_PATTERN.test(name)
    if (!hiddenByName || seen.has(trimmed)) {
      continue
    }
    seen.add(trimmed)
    values.push(trimmed)
  }
  return values
}

export function redactHiddenEnvValues(
  text: string,
  env: KfzSupabaseEnvSource = process.env,
): string {
  let out = text
  for (const value of collectHiddenEnvValues(env)) {
    out = out.split(value).join('[redacted]')
  }
  return out
}

export function kfzSupabasePreflightContainsHiddenValue(
  text: string,
  env: KfzSupabaseEnvSource = process.env,
): boolean {
  return collectHiddenEnvValues(env).some((value) => text.includes(value))
}

export function formatKfzSupabasePreflightReport(
  report: KfzSupabasePreflightReport,
): string {
  const lines: string[] = [
    `AgenturOS · ${report.headline}`,
    report.disclaimer,
    '',
    `Command: npm run ${report.command}`,
    `Scope: ${report.scope}`,
    `Production claim: ${String(report.productionClaim)}`,
    `Applies migrations: ${String(report.appliesMigrations)}`,
    `Deploys: ${String(report.deploys)}`,
    `Contract: ${report.contractOk ? 'ok' : 'blocked'}`,
    `This process persist configured: ${report.thisProcessConfigured ? 'yes' : 'no'}`,
    '',
    'Env names (present/missing, no values):',
  ]

  for (const entry of report.env) {
    lines.push(
      `  ${entry.name}  ${entry.present ? 'present' : 'missing'}${entry.required ? '' : ' (optional)'}`,
    )
  }

  lines.push('', 'Checks:')
  for (const entry of report.checks) {
    lines.push(`  [${entry.status}] ${entry.label}`)
    lines.push(`    ${entry.detail}`)
  }

  lines.push('', 'Owner checklist (existing Supabase + Vercel only):')
  report.ownerChecklist.forEach((step, index) => {
    lines.push(`  ${index + 1}. [${step.tool}] ${step.instruction}`)
  })

  lines.push(
    '',
    `Counts: PASS ${report.counts.pass} · BLOCKED ${report.counts.blocked} · OWNER INPUT ${report.counts.ownerInput} · NOT VERIFIED ${report.counts.notVerified}`,
  )

  return `${lines.join('\n')}\n`
}

export function renderKfzSupabasePreflight(
  report: KfzSupabasePreflightReport,
  env: KfzSupabaseEnvSource = process.env,
): string {
  const serialized = JSON.stringify(report)
  const formatted = formatKfzSupabasePreflightReport(report)
  const combined = `${formatted}\n${serialized}\n`
  return redactHiddenEnvValues(combined, env)
}

export function kfzSupabasePreflightHasProductionClaim(
  report: KfzSupabasePreflightReport,
): boolean {
  if (report.productionClaim !== false || report.appliesMigrations !== false || report.deploys !== false) {
    return true
  }
  const blob = JSON.stringify(report).toLowerCase()
  return (
    blob.includes('produktionsbereit') ||
    blob.includes('production ready') ||
    blob.includes('ready for production') ||
    blob.includes('launch approved')
  )
}
