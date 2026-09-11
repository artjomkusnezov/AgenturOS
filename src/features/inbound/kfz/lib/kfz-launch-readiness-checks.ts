/**
 * Owner-facing Kfz launch checks and synthetic probes.
 *
 * Names/presence and local contracts only. Never returns secret values,
 * form answers, personal data, filenames, object keys or document bytes.
 */

import fs from 'node:fs'
import path from 'node:path'

import { authorizeKfzDocumentReview } from '@/features/inbound/kfz/lib/kfz-document-storage'
import {
  inspectKfzPrivateBucketMigration,
} from '@/features/inbound/kfz/lib/kfz-supabase-preflight'
import {
  kfzSupabasePersistFailClosed,
  KFZ_SUPABASE_PERSIST_ENV_NAMES,
  KFZ_SUPABASE_PERSIST_MISSING_ERROR,
  type KfzSupabaseEnvSource,
} from '@/features/inbound/kfz/lib/kfz-supabase-persist-env'
import {
  getPublicSupabaseBootState,
  NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME,
  NEXT_PUBLIC_SUPABASE_URL_NAME,
} from '@/lib/supabase/public-config'
import type {
  KfzLaunchCheck,
  KfzLaunchCheckId,
  KfzLaunchFilePresence,
  KfzLaunchOwnerCounts,
  KfzLaunchOwnerStatus,
  KfzLaunchProbe,
  KfzLaunchReadinessRef,
} from '@/features/inbound/kfz/types/kfz-launch-readiness'

const SYNTHETIC_AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const SYNTHETIC_ITEM_ID = '33333333-3333-4333-8333-333333333333'
const SYNTHETIC_OTHER_ITEM_ID = '55555555-5555-4555-8555-555555555555'
const SYNTHETIC_OBJECT_ID = '44444444-4444-4444-8444-444444444444'

export const KFZ_LAUNCH_OWNER_READY_DETAIL =
  'Fragebogen, Persistenz, private Dokumente, Inbox-Prüfung und Analytics sind in diesem Prozess namentlich konfiguriert. Das ist keine Produktionsfreigabe.'

export const KFZ_LAUNCH_OWNER_BLOCKED_DETAIL =
  'Mindestens ein Pflichtpunkt fehlt oder der lokale Vertrag ist unvollständig.'

export const KFZ_LAUNCH_OWNER_UNKNOWN_DETAIL =
  'Mindestens ein Pflichtpunkt konnte hier nicht geprüft werden. Kein Production-Zugriff und keine Secret-Werte.'

export type KfzLaunchProbeOverrides = {
  unauthorizedReview?: 'rejected' | 'allowed' | 'unavailable'
  persistUnavailable?: 'fail_closed' | 'open' | 'unavailable'
}

function filePresent(
  files: readonly KfzLaunchFilePresence[],
  relative: string,
): boolean {
  return files.some((entry) => entry.path === relative && entry.present)
}

function readRepoFile(repoRoot: string, relative: string): string | null {
  const full = path.join(repoRoot, relative)
  if (!fs.existsSync(full)) {
    return null
  }
  return fs.readFileSync(full, 'utf8')
}

function routeRef(label: string, href: string): KfzLaunchReadinessRef {
  return { kind: 'route', label, href }
}

function codeRef(pathName: string): KfzLaunchReadinessRef {
  return { kind: 'code', label: pathName, path: pathName }
}

function envRef(name: string): KfzLaunchReadinessRef {
  return { kind: 'env', label: name, envName: name }
}

function migrationRef(file: string): KfzLaunchReadinessRef {
  return { kind: 'migration', label: file, path: file }
}

function check(
  id: KfzLaunchCheckId,
  label: string,
  status: KfzLaunchOwnerStatus,
  detail: string,
  nextAction: string | null,
  refs: readonly KfzLaunchReadinessRef[],
): KfzLaunchCheck {
  return {
    id,
    label,
    status,
    detail,
    nextAction: status === 'READY' ? null : nextAction,
    refs,
  }
}

export function snapshotKfzLaunchPublicEnvPresence(
  env: KfzSupabaseEnvSource,
): { configured: boolean; missingNames: readonly string[] } {
  const boot = getPublicSupabaseBootState(env)
  if (boot.ready) {
    return { configured: true, missingNames: [] }
  }
  return { configured: false, missingNames: boot.missingNames }
}

function inspectInboxItemCreation(repoRoot: string): boolean {
  const processFile = readRepoFile(
    repoRoot,
    'src/features/inbound/kfz/services/process-kfz-inquiry.ts',
  )
  const adapter = readRepoFile(repoRoot, 'src/features/inbound/kfz/lib/kfz-adapter.ts')
  const present = readRepoFile(
    repoRoot,
    'src/features/inbox/lib/present-kfz-website-inbox.ts',
  )
  return Boolean(
    processFile &&
      adapter &&
      present &&
      processFile.includes('ingestInboundItem') &&
      processFile.includes('inboxItemId') &&
      processFile.includes("channel: 'website'") &&
      adapter.includes("channel: 'website'") &&
      present.includes('presentKfzWebsiteInboxItem'),
  )
}

function inspectAnalyticsMetadataOnly(repoRoot: string): boolean {
  const redact = readRepoFile(repoRoot, 'src/features/inbound/kfz/lib/kfz-analytics-redact.ts')
  const boundary = readRepoFile(
    repoRoot,
    'src/features/inbound/kfz/lib/kfz-analytics-privacy-boundary.ts',
  )
  const ingest = readRepoFile(repoRoot, 'src/features/inbound/kfz/lib/kfz-analytics-ingest.ts')
  const health = readRepoFile(repoRoot, 'src/features/inbound/kfz/lib/kfz-analytics-health.ts')
  return Boolean(
    redact &&
      boundary &&
      ingest &&
      health &&
      redact.includes("'filename'") &&
      redact.includes("'objectkey'") &&
      redact.includes("'answer'") &&
      boundary.includes('file names') &&
      boundary.includes('object keys') &&
      ingest.includes('sanitizeKfzAnalyticsRecord') &&
      ingest.includes('insertKfzAnalyticsEventWithRetry') &&
      health.includes('consent_blocked') &&
      health.includes('transient_failed') &&
      health.includes('READY') &&
      health.includes('BLOCKED') &&
      health.includes('UNKNOWN'),
  )
}

function inspectReviewRouteContract(repoRoot: string): boolean {
  const storage = readRepoFile(repoRoot, 'src/features/inbound/kfz/lib/kfz-document-storage.ts')
  const route = readRepoFile(repoRoot, 'src/app/app/inbox/kfz-document/route.ts')
  return Boolean(
    storage &&
      route &&
      storage.includes('authorizeKfzDocumentReview') &&
      storage.includes('status: 401') &&
      storage.includes('status: 404') &&
      route.includes('authorizeKfzDocumentReview') &&
      route.includes('401'),
  )
}

export function probeKfzLaunchUnauthorizedReview(
  override?: KfzLaunchProbeOverrides['unauthorizedReview'],
): KfzLaunchProbe {
  if (override === 'unavailable') {
    return {
      id: 'unauthorized_review',
      status: 'UNKNOWN',
      outcome: 'unavailable',
      detail:
        'Der synthetische Review-Probe war nicht verfügbar. Kein Production-Zugriff, keine Dateinamen oder Object-Keys.',
    }
  }
  if (override === 'allowed') {
    return {
      id: 'unauthorized_review',
      status: 'BLOCKED',
      outcome: 'allowed',
      detail:
        'Der synthetische Probe würde anonymen oder fremden Dokumentzugriff erlauben. Prüfung muss 401/404 bleiben.',
    }
  }
  if (override === 'rejected') {
    return {
      id: 'unauthorized_review',
      status: 'READY',
      outcome: 'rejected',
      detail:
        'Synthetischer Probe: anonym und fremdes Item werden ohne Dateiname, Object-Key oder Inhalt abgelehnt.',
    }
  }

  try {
    const objectKey = `kfz/${SYNTHETIC_AGENCY_ID}/${SYNTHETIC_OBJECT_ID}`
    const item = {
      id: SYNTHETIC_ITEM_ID,
      agencyId: SYNTHETIC_AGENCY_ID,
      objectKeys: [objectKey],
      filenameByObjectKey: { [objectKey]: 'synthetic' },
      mimeTypeByObjectKey: { [objectKey]: 'application/pdf' },
    }
    const authorized = authorizeKfzDocumentReview({
      actor: { authenticated: true, agencyId: SYNTHETIC_AGENCY_ID },
      item,
      requestedItemId: SYNTHETIC_ITEM_ID,
      requestedObjectKey: objectKey,
    })
    const anonymous = authorizeKfzDocumentReview({
      actor: { authenticated: false, agencyId: null },
      item,
      requestedItemId: SYNTHETIC_ITEM_ID,
      requestedObjectKey: objectKey,
    })
    const crossItem = authorizeKfzDocumentReview({
      actor: { authenticated: true, agencyId: SYNTHETIC_AGENCY_ID },
      item,
      requestedItemId: SYNTHETIC_OTHER_ITEM_ID,
      requestedObjectKey: objectKey,
    })

    const rejected =
      authorized.ok === true &&
      anonymous.ok === false &&
      anonymous.status === 401 &&
      crossItem.ok === false &&
      crossItem.status === 404

    if (rejected) {
      return {
        id: 'unauthorized_review',
        status: 'READY',
        outcome: 'rejected',
        detail:
          'Synthetischer Probe: angemeldete Prüfung derselben Agency ist erlaubt; anonym (401) und fremdes Item (404) bleiben gesperrt. Keine Dateinamen, Object-Keys oder Inhalte in diesem Bericht.',
      }
    }

    return {
      id: 'unauthorized_review',
      status: 'BLOCKED',
      outcome: authorized.ok === false ? 'rejected' : 'allowed',
      detail:
        'Synthetischer Probe: autorisierte Prüfung oder 401/404-Ablehnung erfüllt den Vertrag nicht. Keine Dateinamen oder Inhalte.',
    }
  } catch {
    return {
      id: 'unauthorized_review',
      status: 'UNKNOWN',
      outcome: 'unavailable',
      detail:
        'Der synthetische Review-Probe konnte nicht ausgeführt werden. Kein Production-Zugriff.',
    }
  }
}

export function probeKfzLaunchPersistUnavailable(
  env: KfzSupabaseEnvSource,
  override?: KfzLaunchProbeOverrides['persistUnavailable'],
): KfzLaunchProbe {
  if (override === 'unavailable') {
    return {
      id: 'persist_unavailable',
      status: 'UNKNOWN',
      outcome: 'unavailable',
      detail:
        'Der synthetische Persistenz-Probe war nicht verfügbar. Werte werden nicht angezeigt.',
    }
  }
  if (override === 'open') {
    return {
      id: 'persist_unavailable',
      status: 'BLOCKED',
      outcome: 'open',
      detail:
        'Der synthetische Probe würde ohne Pflichtnamen einen Store erlauben. Fail-closed muss store_unavailable bleiben.',
    }
  }
  if (override === 'fail_closed') {
    return {
      id: 'persist_unavailable',
      status: 'READY',
      outcome: 'fail_closed',
      detail: `Fehlende Persistenz-Namen verhindern den Store (${KFZ_SUPABASE_PERSIST_MISSING_ERROR}). Keine Secret-Werte.`,
    }
  }

  try {
    const empty = kfzSupabasePersistFailClosed({})
    const current = kfzSupabasePersistFailClosed(env)
    const emptyClosed =
      empty.allowsStore === false && empty.error === KFZ_SUPABASE_PERSIST_MISSING_ERROR
    if (!emptyClosed) {
      return {
        id: 'persist_unavailable',
        status: 'BLOCKED',
        outcome: 'open',
        detail:
          'Ohne Persistenz-Namen darf kein Store entstehen. Der synthetische Probe blieb nicht fail-closed.',
      }
    }

    return {
      id: 'persist_unavailable',
      status: 'READY',
      outcome: 'fail_closed',
      detail: current.allowsStore
        ? `Pflichtnamen für Persistenz sind in diesem Prozess gesetzt. Fehlende Namen bleiben fail-closed (${KFZ_SUPABASE_PERSIST_MISSING_ERROR}). Werte werden nicht angezeigt.`
        : `In diesem Prozess fehlen Persistenz-Namen. Store bleibt geschlossen (${KFZ_SUPABASE_PERSIST_MISSING_ERROR}). Werte werden nicht angezeigt.`,
    }
  } catch {
    return {
      id: 'persist_unavailable',
      status: 'UNKNOWN',
      outcome: 'unavailable',
      detail:
        'Der synthetische Persistenz-Probe konnte nicht ausgeführt werden. Keine Secret-Werte.',
    }
  }
}

export function evaluateKfzLaunchOwnerChecks(input: {
  questionnaireOk: boolean
  files: readonly KfzLaunchFilePresence[]
  env: KfzSupabaseEnvSource
  repoRoot: string
  persistConfigured: boolean
  intakeConfigured: boolean
  missingIntakeNames: readonly string[]
  missingPersistNames: readonly string[]
  migrationsPresent: boolean
  probeOverrides?: KfzLaunchProbeOverrides
}): {
  checks: KfzLaunchCheck[]
  probes: KfzLaunchProbe[]
  result: KfzLaunchOwnerStatus
  resultDetail: string
  nextAction: string | null
  ownerCounts: KfzLaunchOwnerCounts
} {
  const publicEnv = snapshotKfzLaunchPublicEnvPresence(input.env)
  const bucket = inspectKfzPrivateBucketMigration(input.repoRoot)
  const inboxOk =
    filePresent(input.files, 'src/app/app/inbox/page.tsx') &&
    filePresent(input.files, 'src/features/inbox/lib/present-kfz-website-inbox.ts') &&
    inspectInboxItemCreation(input.repoRoot)
  const reviewFilesOk =
    filePresent(input.files, 'src/app/app/inbox/kfz-document/route.ts') &&
    filePresent(input.files, 'src/features/inbound/kfz/lib/kfz-document-storage.ts') &&
    inspectReviewRouteContract(input.repoRoot)
  const analyticsOk =
    filePresent(input.files, 'src/app/app/kfz-analytics/page.tsx') &&
    filePresent(input.files, 'src/app/api/inbound/kfz-analytics/route.ts') &&
    filePresent(input.files, 'src/features/inbound/kfz/lib/kfz-analytics-ingest.ts') &&
    filePresent(input.files, 'src/features/inbound/kfz/lib/kfz-analytics-health.ts') &&
    filePresent(
      input.files,
      'src/features/inbound/kfz/lib/kfz-analytics-privacy-boundary.ts',
    ) &&
    inspectAnalyticsMetadataOnly(input.repoRoot)
  const submitOk =
    filePresent(input.files, 'src/app/api/inbound/kfz/route.ts') &&
    filePresent(
      input.files,
      'src/features/inbound/kfz/lib/kfz-landing-submit-session.ts',
    )

  const unauthorized = probeKfzLaunchUnauthorizedReview(
    input.probeOverrides?.unauthorizedReview,
  )
  const persistProbe = probeKfzLaunchPersistUnavailable(
    input.env,
    input.probeOverrides?.persistUnavailable,
  )

  const missingPublic =
    publicEnv.missingNames.join(', ') ||
    `${NEXT_PUBLIC_SUPABASE_URL_NAME}, ${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME}`
  const missingPersist =
    input.missingPersistNames.join(', ') || KFZ_SUPABASE_PERSIST_ENV_NAMES.join(', ')
  const missingIntake =
    input.missingIntakeNames.join(', ') ||
    'INBOUND_KFZ_INTAKE_SECRET, INBOUND_KFZ_AGENCY_ID, INBOUND_KFZ_ACTOR_USER_ID'

  const persistReady =
    input.persistConfigured &&
    input.intakeConfigured &&
    submitOk &&
    persistProbe.outcome === 'fail_closed' &&
    persistProbe.status !== 'BLOCKED' &&
    persistProbe.status !== 'UNKNOWN'
  const persistUnknown = persistProbe.status === 'UNKNOWN'
  const persistStatus: KfzLaunchOwnerStatus = persistUnknown
    ? 'UNKNOWN'
    : persistReady
      ? 'READY'
      : 'BLOCKED'

  const reviewReady =
    reviewFilesOk &&
    unauthorized.outcome === 'rejected' &&
    unauthorized.status === 'READY'
  const reviewUnknown = unauthorized.status === 'UNKNOWN'
  const reviewStatus: KfzLaunchOwnerStatus = reviewUnknown
    ? 'UNKNOWN'
    : reviewReady
      ? 'READY'
      : 'BLOCKED'

  const checks: KfzLaunchCheck[] = [
    check(
      'questionnaire',
      'Fragebogen und sechs Zweige',
      input.questionnaireOk ? 'READY' : 'BLOCKED',
      input.questionnaireOk
        ? 'Sechs Startzweige, Kontaktprüfung und Anfrage-Consent sind im lokalen Vertrag.'
        : 'Fragebogen, Zweige oder Consent-Validierung erfüllen den lokalen Vertrag nicht.',
      'KFZ_LANDING_BRANCHES, Kontakt- und Consent-Validierung im Repository wiederherstellen. Keine Kundendaten senden.',
      [
        routeRef('/kfz', '/kfz'),
        codeRef('src/features/inbound/kfz/lib/kfz-questionnaire.ts'),
        codeRef('src/features/inbound/kfz/lib/kfz-landing-steps.ts'),
      ],
    ),
    check(
      'public_configuration',
      'Öffentliche Konfigurationsnamen',
      publicEnv.configured ? 'READY' : 'BLOCKED',
      publicEnv.configured
        ? `${NEXT_PUBLIC_SUPABASE_URL_NAME} und ${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME} (oder ${NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME}) sind in diesem Prozess gesetzt. Werte werden nicht angezeigt.`
        : `In diesem Prozess fehlen: ${missingPublic}. Werte werden nicht angezeigt.`,
      `Im bestehenden Vercel-Projekt ${missingPublic} setzen. Werte bleiben in Vercel und werden hier nicht eingefügt.`,
      [
        envRef(NEXT_PUBLIC_SUPABASE_URL_NAME),
        envRef(NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME),
        envRef(NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME),
      ],
    ),
    check(
      'migrations',
      'Eingecheckte Pflicht-Migrationen',
      input.migrationsPresent ? 'READY' : 'BLOCKED',
      input.migrationsPresent
        ? 'Website-Inbox, Analytics-Events, Analytics-Persistenzvertrag und privater Dokument-Bucket sind als SQL-Dateien im Repository. Apply bleibt Owner.'
        : 'Mindestens eine Kfz-Pflichtmigration fehlt im Repository.',
      'Die eingecheckten SQL-Dateien im Repository behalten. Apply auf Preview/Production bleibt Owner — dieser Check wendet nichts an.',
      [
        migrationRef('supabase/migrations/20260906120000_inbox_website_channel_source.sql'),
        migrationRef('supabase/migrations/20260909140000_kfz_funnel_analytics_events.sql'),
        migrationRef('supabase/migrations/20260910120000_kfz_inbound_documents_bucket.sql'),
        migrationRef('supabase/migrations/20260911120000_kfz_funnel_analytics_persistence_contract.sql'),
      ],
    ),
    check(
      'private_documents',
      'Privater Bucket und Policies',
      bucket.ok ? 'READY' : 'BLOCKED',
      bucket.ok
        ? 'Migration setzt kfz-inbound-documents auf public=false ohne anon/authenticated Policies. Apply bleibt Owner.'
        : bucket.detail,
      'Private-Bucket-Migration kfz-inbound-documents prüfen: public=false, keine anon/authenticated Policies, kein öffentlicher Link.',
      [
        migrationRef('supabase/migrations/20260910120000_kfz_inbound_documents_bucket.sql'),
        codeRef('src/features/inbound/kfz/lib/kfz-document-storage.ts'),
        routeRef('/app/inbox/kfz-document', '/app/inbox/kfz-document'),
      ],
    ),
    check(
      'submission_persistence',
      'Anfrage-Persistenz',
      persistStatus,
      persistStatus === 'READY'
        ? 'Intake-Namen und Persistenz-Namen sind in diesem Prozess gesetzt. Submit-Pfad ist eingecheckt. Fehlende Namen bleiben fail-closed. Werte werden nicht angezeigt.'
        : persistUnknown
          ? persistProbe.detail
          : !submitOk
            ? 'Submit-Session oder POST /api/inbound/kfz fehlt im Repository.'
            : !input.intakeConfigured
              ? `In diesem Prozess fehlen Intake-Namen: ${missingIntake}. Werte werden nicht angezeigt.`
              : persistProbe.outcome === 'open'
                ? persistProbe.detail
                : `In diesem Prozess fehlen Persistenz-Namen: ${missingPersist}. Werte werden nicht angezeigt.`,
      persistUnknown
        ? 'Persistenz lokal nicht prüfbar. Keine Secrets lesen und Production nicht anfassen.'
        : !submitOk
          ? 'kfz-landing-submit-session.ts und POST /api/inbound/kfz im Repository wiederherstellen. Keinen Kunden-Submit senden.'
          : !input.intakeConfigured
            ? `Im bestehenden Vercel-Projekt ${missingIntake} setzen. Werte bleiben in Vercel.`
            : persistProbe.outcome === 'open'
              ? 'Fail-closed für fehlende Persistenz-Namen wiederherstellen. Store muss store_unavailable bleiben.'
              : `Im bestehenden Vercel-Projekt ${missingPersist} setzen. Werte bleiben in Vercel und werden hier nicht eingefügt.`,
      [
        envRef(KFZ_SUPABASE_PERSIST_ENV_NAMES[0]),
        envRef(KFZ_SUPABASE_PERSIST_ENV_NAMES[1]),
        envRef('INBOUND_KFZ_INTAKE_SECRET'),
        routeRef('POST /api/inbound/kfz', '/api/inbound/kfz'),
      ],
    ),
    check(
      'inbox_item_creation',
      'Inbox-Item aus Website-Intake',
      inboxOk ? 'READY' : 'BLOCKED',
      inboxOk
        ? 'Intake erzeugt ein InboundItem (channel=website) in der bestehenden Inbox. Kein zweites Kundenbuch.'
        : 'Inbox-Route, Adapter oder Intake-Pfad für das Website-Item fehlt.',
      'Intake-Pfad POST /api/inbound/kfz → bestehendes Inbox-Item im Repository wiederherstellen. Keinen Kunden-Submit senden.',
      [
        routeRef('/app/inbox', '/app/inbox'),
        routeRef('POST /api/inbound/kfz', '/api/inbound/kfz'),
        codeRef('src/features/inbox/lib/present-kfz-website-inbox.ts'),
      ],
    ),
    check(
      'authorized_review',
      'Autorisierte Dokumentprüfung',
      reviewStatus,
      reviewStatus === 'READY'
        ? 'Prüfroute ist eingecheckt. Synthetischer Probe lehnt anonym/fremd mit 401/404 ab. Keine Dateinamen oder Inhalte in diesem Bericht.'
        : reviewUnknown
          ? unauthorized.detail
          : !reviewFilesOk
            ? 'Autorisierte Prüfroute oder Review-Vertrag fehlt im Repository.'
            : unauthorized.detail,
      reviewUnknown
        ? 'Review-Probe lokal nicht ausführbar. Keine Production-Dokumente öffnen und keine Object-Keys lesen.'
        : !reviewFilesOk
          ? 'Route /app/inbox/kfz-document und authorizeKfzDocumentReview im Repository behalten.'
          : 'authorizeKfzDocumentReview muss anonym/fremd mit 401/404 ablehnen. Keine öffentlichen Storage-Links.',
      [
        routeRef('/app/inbox/kfz-document', '/app/inbox/kfz-document'),
        codeRef('src/features/inbound/kfz/lib/kfz-document-storage.ts'),
      ],
    ),
    check(
      'analytics',
      'Analytics nur Metadaten',
      analyticsOk ? 'READY' : 'BLOCKED',
      analyticsOk
        ? 'Ingest, Redaction, begrenzter Retry und /app/kfz-analytics sind vorhanden. READY/BLOCKED/UNKNOWN ohne Secrets. Keine Antworten, Dateinamen, Object-Keys oder Personenbezüge.'
        : 'Analytics-Dashboard, Ingest, Health oder Privacy-Grenze fehlt.',
      'Analytics-Redaction, Retry und Privacy-Grenze wiederherstellen. Keine Antworten, Dateinamen oder Object-Keys speichern.',
      [
        routeRef('/app/kfz-analytics', '/app/kfz-analytics'),
        routeRef('POST /api/inbound/kfz-analytics', '/api/inbound/kfz-analytics'),
        codeRef('src/features/inbound/kfz/lib/kfz-analytics-privacy-boundary.ts'),
        codeRef('src/features/inbound/kfz/lib/kfz-analytics-health.ts'),
      ],
    ),
  ]

  const ownerCounts = countOwnerChecks(checks)
  const result = deriveOwnerResult(checks)
  const firstFailed = checks.find((entry) => entry.status !== 'READY') ?? null

  return {
    checks,
    probes: [unauthorized, persistProbe],
    result,
    resultDetail:
      result === 'READY'
        ? KFZ_LAUNCH_OWNER_READY_DETAIL
        : result === 'BLOCKED'
          ? KFZ_LAUNCH_OWNER_BLOCKED_DETAIL
          : KFZ_LAUNCH_OWNER_UNKNOWN_DETAIL,
    nextAction: firstFailed?.nextAction ?? null,
    ownerCounts,
  }
}

export function countOwnerChecks(
  checks: readonly KfzLaunchCheck[],
): KfzLaunchOwnerCounts {
  const counts: KfzLaunchOwnerCounts = { ready: 0, blocked: 0, unknown: 0 }
  for (const entry of checks) {
    if (entry.status === 'READY') counts.ready += 1
    if (entry.status === 'BLOCKED') counts.blocked += 1
    if (entry.status === 'UNKNOWN') counts.unknown += 1
  }
  return counts
}

export function deriveOwnerResult(
  checks: readonly KfzLaunchCheck[],
): KfzLaunchOwnerStatus {
  if (checks.some((entry) => entry.status === 'BLOCKED')) {
    return 'BLOCKED'
  }
  if (checks.length === 0 || checks.some((entry) => entry.status === 'UNKNOWN')) {
    return 'UNKNOWN'
  }
  return 'READY'
}

export function listKfzLaunchForbiddenReportValues(
  env: KfzSupabaseEnvSource = {},
): string[] {
  const values: string[] = []
  const seen = new Set<string>()
  const push = (value: string | undefined) => {
    const trimmed = value?.trim() ?? ''
    if (trimmed.length < 8 || seen.has(trimmed)) {
      return
    }
    seen.add(trimmed)
    values.push(trimmed)
  }

  for (const value of Object.values(env)) {
    push(value)
  }

  push(`kfz/${SYNTHETIC_AGENCY_ID}/${SYNTHETIC_OBJECT_ID}`)
  push(SYNTHETIC_OBJECT_ID)
  push('synthetic.pdf')
  return values
}
