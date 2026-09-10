/**
 * Factual Kfz launch-readiness evaluation.
 *
 * Inspects checked-in routes, branches, validators, migrations and whether
 * named environment variables are set in this process. It never reads or
 * returns secret values, never talks to production, and never claims a launch
 * approval from local fixtures.
 */

import fs from 'node:fs'
import path from 'node:path'

import { listMissingInboundKfzEnvFields } from '@/features/inbound/kfz/config/inbound-kfz-config'
import { KFZ_LANDING_STORAGE_BLOCKER } from '@/features/inbound/kfz/lib/kfz-landing-documents'
import {
  validateKfzLandingConsent,
  validateKfzLandingContact,
} from '@/features/inbound/kfz/lib/kfz-landing-steps'
import { KFZ_LANDING_BRANCHES } from '@/features/inbound/kfz/lib/kfz-questionnaire'
import type {
  KfzLaunchEnvPresence,
  KfzLaunchFilePresence,
  KfzLaunchReadinessCounts,
  KfzLaunchReadinessFact,
  KfzLaunchReadinessItem,
  KfzLaunchReadinessRef,
  KfzLaunchReadinessReport,
  KfzLaunchReadinessStatus,
} from '@/features/inbound/kfz/types/kfz-launch-readiness'

export const KFZ_LAUNCH_READINESS_DISCLAIMER =
  'Keine Produktionsfreigabe. Diese Seite bewertet den lokalen Code-Vertrag und benennt bekannte Lücken. PASS kommt nicht aus Production-Daten. Owner entscheidet über Domain, Migration-Apply, Secrets, Rechtstext, Kampagne und Go-Live.'

export const KFZ_LAUNCH_READINESS_HEADLINE =
  'Kfz-Startlage · faktisch, lokal, ohne Launch-Behauptung'

export const KFZ_LAUNCH_REQUIRED_BRANCH_IDS = [
  'upload_documents',
  'no_documents',
  'first_car',
  'additional_car',
  'switch_car',
  'evb',
] as const

export const KFZ_LAUNCH_REQUIRED_BRANCH_LABELS = [
  'Unterlagen hochladen',
  'Keine Unterlagen vorhanden',
  'Erstes Auto versichern',
  'Weiteres Auto versichern',
  'Bestehendes Auto wechseln',
  'eVB für Zulassung',
] as const

export const KFZ_LAUNCH_REQUIRED_MIGRATIONS = [
  {
    file: 'supabase/migrations/20260906120000_inbox_website_channel_source.sql',
    purpose: 'inbox_items channel/source website',
  },
  {
    file: 'supabase/migrations/20260909140000_kfz_funnel_analytics_events.sql',
    purpose: 'kfz_funnel_analytics_events',
  },
] as const

export const KFZ_LAUNCH_REQUIRED_FILES = [
  'src/app/kfz/page.tsx',
  'src/app/app/inbox/page.tsx',
  'src/app/app/kfz-analytics/page.tsx',
  'src/app/app/kfz-readiness/page.tsx',
  'src/app/api/inbound/kfz/route.ts',
  'src/app/api/inbound/kfz-analytics/route.ts',
  'src/features/inbound/kfz/lib/kfz-questionnaire.ts',
  'src/features/inbound/kfz/lib/kfz-landing-submit-session.ts',
  'src/features/inbound/kfz/lib/validate-public-kfz-inquiry.ts',
  'src/features/inbox/lib/present-kfz-website-inbox.ts',
  'src/features/inbox/lib/kfz-inbox-manual-triage.ts',
  'src/features/inbound/kfz/lib/kfz-analytics-ingest.ts',
  'src/features/inbound/kfz/lib/kfz-analytics-privacy-boundary.ts',
  ...KFZ_LAUNCH_REQUIRED_MIGRATIONS.map((entry) => entry.file),
  'docs/kfz-inbound-local-test.md',
  '.env.example',
] as const

const ROUTE_LANDING: KfzLaunchReadinessRef = {
  kind: 'route',
  label: '/kfz',
  href: '/kfz',
}

const ROUTE_INBOX: KfzLaunchReadinessRef = {
  kind: 'route',
  label: '/app/inbox',
  href: '/app/inbox',
}

const ROUTE_ANALYTICS: KfzLaunchReadinessRef = {
  kind: 'route',
  label: '/app/kfz-analytics',
  href: '/app/kfz-analytics',
}

const ROUTE_READINESS: KfzLaunchReadinessRef = {
  kind: 'route',
  label: '/app/kfz-readiness',
  href: '/app/kfz-readiness',
}

const ROUTE_INTAKE_API: KfzLaunchReadinessRef = {
  kind: 'route',
  label: 'POST /api/inbound/kfz',
  href: '/api/inbound/kfz',
}

const ROUTE_ANALYTICS_API: KfzLaunchReadinessRef = {
  kind: 'route',
  label: 'POST /api/inbound/kfz-analytics',
  href: '/api/inbound/kfz-analytics',
}

const DOC_LOCAL_TEST: KfzLaunchReadinessRef = {
  kind: 'doc',
  label: 'docs/kfz-inbound-local-test.md',
  path: 'docs/kfz-inbound-local-test.md',
}

const DOC_ENV_EXAMPLE: KfzLaunchReadinessRef = {
  kind: 'doc',
  label: '.env.example',
  path: '.env.example',
}

function envRef(name: string): KfzLaunchReadinessRef {
  return { kind: 'env', label: name, envName: name }
}

function codeRef(pathName: string): KfzLaunchReadinessRef {
  return { kind: 'code', label: pathName, path: pathName }
}

function migrationRef(file: string): KfzLaunchReadinessRef {
  return { kind: 'migration', label: file, path: file }
}

type KfzLaunchEnvSource = Record<string, string | undefined>

function present(name: string, env: KfzLaunchEnvSource): boolean {
  return Boolean(env[name]?.trim())
}

export function snapshotKfzLaunchEnvPresence(
  env: KfzLaunchEnvSource = process.env,
): KfzLaunchEnvPresence[] {
  return [
    {
      name: 'INBOUND_KFZ_INTAKE_SECRET',
      present: present('INBOUND_KFZ_INTAKE_SECRET', env),
      requiredFor: 'intake',
    },
    {
      name: 'INBOUND_KFZ_AGENCY_ID',
      present: present('INBOUND_KFZ_AGENCY_ID', env),
      fallbackName: 'INBOUND_EMAIL_AGENCY_ID',
      fallbackPresent: present('INBOUND_EMAIL_AGENCY_ID', env),
      requiredFor: 'intake',
    },
    {
      name: 'INBOUND_KFZ_ACTOR_USER_ID',
      present: present('INBOUND_KFZ_ACTOR_USER_ID', env),
      fallbackName: 'INBOUND_EMAIL_ACTOR_USER_ID',
      fallbackPresent: present('INBOUND_EMAIL_ACTOR_USER_ID', env),
      requiredFor: 'intake',
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      present: present('NEXT_PUBLIC_SUPABASE_URL', env),
      requiredFor: 'persist',
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      present: present('SUPABASE_SERVICE_ROLE_KEY', env),
      requiredFor: 'persist',
    },
    {
      name: 'INBOUND_KFZ_RATE_LIMIT_MAX',
      present: present('INBOUND_KFZ_RATE_LIMIT_MAX', env),
      requiredFor: 'optional',
    },
    {
      name: 'INBOUND_KFZ_RATE_LIMIT_WINDOW_MS',
      present: present('INBOUND_KFZ_RATE_LIMIT_WINDOW_MS', env),
      requiredFor: 'optional',
    },
  ]
}

export function resolveKfzLaunchRepoRoot(
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

export function inspectKfzLaunchFiles(
  repoRoot: string = resolveKfzLaunchRepoRoot(),
): KfzLaunchFilePresence[] {
  return KFZ_LAUNCH_REQUIRED_FILES.map((relative) => ({
    path: relative,
    present: fs.existsSync(path.join(repoRoot, relative)),
  }))
}

function filePresent(
  files: readonly KfzLaunchFilePresence[],
  relative: string,
): boolean {
  return files.some((entry) => entry.path === relative && entry.present)
}

function intakeConfigured(env: readonly KfzLaunchEnvPresence[]): boolean {
  const secret = env.find((entry) => entry.name === 'INBOUND_KFZ_INTAKE_SECRET')
  const agency = env.find((entry) => entry.name === 'INBOUND_KFZ_AGENCY_ID')
  const actor = env.find((entry) => entry.name === 'INBOUND_KFZ_ACTOR_USER_ID')
  return Boolean(
    secret?.present &&
      (agency?.present || agency?.fallbackPresent) &&
      (actor?.present || actor?.fallbackPresent),
  )
}

function persistConfigured(env: readonly KfzLaunchEnvPresence[]): boolean {
  const url = env.find((entry) => entry.name === 'NEXT_PUBLIC_SUPABASE_URL')
  const key = env.find((entry) => entry.name === 'SUPABASE_SERVICE_ROLE_KEY')
  return Boolean(url?.present && key?.present)
}

function missingIntakeNames(env: KfzLaunchEnvSource): string[] {
  return listMissingInboundKfzEnvFields().filter((name) => {
    if (name === 'INBOUND_KFZ_AGENCY_ID') {
      return !present('INBOUND_KFZ_AGENCY_ID', env) && !present('INBOUND_EMAIL_AGENCY_ID', env)
    }
    if (name === 'INBOUND_KFZ_ACTOR_USER_ID') {
      return (
        !present('INBOUND_KFZ_ACTOR_USER_ID', env) &&
        !present('INBOUND_EMAIL_ACTOR_USER_ID', env)
      )
    }
    return !present(name, env)
  })
}

function fact(
  id: string,
  label: string,
  status: KfzLaunchReadinessStatus,
  detail: string,
  refs: readonly KfzLaunchReadinessRef[],
): KfzLaunchReadinessFact {
  return { id, label, status, detail, refs }
}

function countFacts(items: readonly KfzLaunchReadinessItem[]): KfzLaunchReadinessCounts {
  const counts: KfzLaunchReadinessCounts = {
    pass: 0,
    blocked: 0,
    ownerInput: 0,
    notVerified: 0,
  }
  for (const item of items) {
    for (const entry of item.facts) {
      if (entry.status === 'PASS') counts.pass += 1
      if (entry.status === 'BLOCKED') counts.blocked += 1
      if (entry.status === 'OWNER_INPUT') counts.ownerInput += 1
      if (entry.status === 'NOT_VERIFIED') counts.notVerified += 1
    }
  }
  return counts
}

export function evaluateKfzLaunchReadiness(input: {
  nowIso?: string
  env?: KfzLaunchEnvSource
  files?: readonly KfzLaunchFilePresence[]
  repoRoot?: string
} = {}): KfzLaunchReadinessReport {
  const envSnapshot = snapshotKfzLaunchEnvPresence(input.env ?? process.env)
  const files =
    input.files ?? inspectKfzLaunchFiles(input.repoRoot ?? resolveKfzLaunchRepoRoot())
  const processEnv = input.env ?? process.env

  const landingFile = filePresent(files, 'src/app/kfz/page.tsx')
  const inboxFile = filePresent(files, 'src/app/app/inbox/page.tsx')
  const analyticsFile = filePresent(files, 'src/app/app/kfz-analytics/page.tsx')
  const intakeApiFile = filePresent(files, 'src/app/api/inbound/kfz/route.ts')
  const analyticsApiFile = filePresent(files, 'src/app/api/inbound/kfz-analytics/route.ts')
  const submitSessionFile = filePresent(
    files,
    'src/features/inbound/kfz/lib/kfz-landing-submit-session.ts',
  )
  const validateFile = filePresent(
    files,
    'src/features/inbound/kfz/lib/validate-public-kfz-inquiry.ts',
  )
  const reviewFile = filePresent(files, 'src/features/inbox/lib/present-kfz-website-inbox.ts')
  const triageFile = filePresent(files, 'src/features/inbox/lib/kfz-inbox-manual-triage.ts')
  const ingestFile = filePresent(files, 'src/features/inbound/kfz/lib/kfz-analytics-ingest.ts')
  const privacyFile = filePresent(
    files,
    'src/features/inbound/kfz/lib/kfz-analytics-privacy-boundary.ts',
  )
  const docsFile = filePresent(files, 'docs/kfz-inbound-local-test.md')
  const envExampleFile = filePresent(files, '.env.example')

  const branchIds = KFZ_LANDING_BRANCHES.map((branch) => branch.id)
  const branchLabels = KFZ_LANDING_BRANCHES.map((branch) => branch.label)
  const sixBranchesOk =
    KFZ_LANDING_BRANCHES.length === 6 &&
    KFZ_LAUNCH_REQUIRED_BRANCH_IDS.every((id, index) => branchIds[index] === id) &&
    KFZ_LAUNCH_REQUIRED_BRANCH_LABELS.every((label, index) => branchLabels[index] === label)

  const missingContact = validateKfzLandingContact({
    fullName: 'Max Mustermann',
    postalCode: '49525',
    city: 'Lengerich',
    phone: '',
    email: '',
    preferredChannel: 'email',
  })
  const whatsappNeedsPhone = validateKfzLandingContact({
    fullName: 'Max Mustermann',
    postalCode: '49525',
    city: 'Lengerich',
    phone: '',
    email: 'max@example.com',
    preferredChannel: 'whatsapp',
  })
  const consentMissing = validateKfzLandingConsent(false)
  const consentGranted = validateKfzLandingConsent(true)
  const validationOk =
    missingContact.ok === false &&
    missingContact.code === 'missing_contact' &&
    whatsappNeedsPhone.ok === false &&
    whatsappNeedsPhone.code === 'whatsapp_requires_phone' &&
    consentMissing.ok === false &&
    consentMissing.code === 'invalid_consent' &&
    consentGranted.ok === true &&
    validateFile

  const missingIntake = missingIntakeNames(processEnv)
  const thisRuntimeIntake = intakeConfigured(envSnapshot)
  const thisRuntimePersist = persistConfigured(envSnapshot)
  const migrationsPresent = KFZ_LAUNCH_REQUIRED_MIGRATIONS.every((entry) =>
    filePresent(files, entry.file),
  )

  const items: KfzLaunchReadinessItem[] = [
    {
      id: 'landing_route',
      title: 'Landing-Route',
      summary: 'Öffentliche Kfz-Strecke unter /kfz. Domain-Mapping ist keine lokale Tatsache.',
      facts: [
        fact(
          'landing_page_present',
          'Route /kfz ist im Repository vorhanden',
          landingFile ? 'PASS' : 'BLOCKED',
          landingFile
            ? 'src/app/kfz/page.tsx existiert. Das ist der lokale Einstieg, nicht kfz.artkus.de live.'
            : 'src/app/kfz/page.tsx fehlt.',
          [ROUTE_LANDING, codeRef('src/app/kfz/page.tsx')],
        ),
        fact(
          'landing_domain',
          'Produktion: kfz.artkus.de → /kfz',
          'OWNER_INPUT',
          'DNS/Vercel-Routing ist Owner-Entscheidung. Lokal nicht verifiziert.',
          [DOC_LOCAL_TEST, ROUTE_LANDING],
        ),
      ],
    },
    {
      id: 'six_branches',
      title: 'Sechs Startzweige',
      summary: 'Dieselben sechs Einstiege wie auf der Landingpage, inkl. Upload und Fragebogen.',
      facts: [
        fact(
          'branch_contract',
          'Sechs Zweige in der freigegebenen Reihenfolge',
          sixBranchesOk ? 'PASS' : 'BLOCKED',
          sixBranchesOk
            ? `Lokal verfügbar: ${KFZ_LAUNCH_REQUIRED_BRANCH_LABELS.join(', ')}.`
            : 'KFZ_LANDING_BRANCHES weicht von den sechs freigegebenen Zweigen ab.',
          [ROUTE_LANDING, codeRef('src/features/inbound/kfz/lib/kfz-questionnaire.ts')],
        ),
      ],
    },
    {
      id: 'contact_consent_validation',
      title: 'Kontakt- und Consent-Prüfung',
      summary: 'Pflichtkontakt und Anfrage-Consent werden lokal abgelehnt, wenn sie fehlen.',
      facts: [
        fact(
          'validation_contract',
          'Fehlender Kontakt oder Consent blockiert lokal',
          validationOk ? 'PASS' : 'BLOCKED',
          validationOk
            ? 'validateKfzLandingContact und validateKfzLandingConsent lehnen fehlende Angaben ab. Anfrage-Consent ist von der Analytics-Zustimmung getrennt.'
            : 'Kontakt- oder Consent-Validierung erfüllt den lokalen Vertrag nicht.',
          [
            ROUTE_LANDING,
            codeRef('src/features/inbound/kfz/lib/kfz-landing-steps.ts'),
            codeRef('src/features/inbound/kfz/lib/validate-public-kfz-inquiry.ts'),
          ],
        ),
      ],
    },
    {
      id: 'submit_retry_idempotency',
      title: 'Submit, Retry, Idempotenz',
      summary: 'Lokaler Vertrag: eine submissionId, Retry nach Fehler, kein zweites Inbox-Item.',
      facts: [
        fact(
          'submit_code',
          'Lokaler Submit-/Retry-Vertrag ist eingecheckt',
          submitSessionFile && intakeApiFile ? 'PASS' : 'BLOCKED',
          submitSessionFile && intakeApiFile
            ? 'kfz-landing-submit-session.ts und POST /api/inbound/kfz sind vorhanden. Local-Memory-Beweis liegt im Acceptance-Test. Production-Persistenz ist das nicht.'
            : 'Submit-Session oder Intake-Route fehlt.',
          [
            ROUTE_LANDING,
            ROUTE_INTAKE_API,
            codeRef('src/features/inbound/kfz/lib/kfz-landing-submit-session.ts'),
            codeRef('src/features/inbound/kfz/actions/submit-kfz-landing-inquiry.ts'),
          ],
        ),
        fact(
          'this_runtime_submit',
          'Dieses Prozess-Environment kann den Live-Handler speisen',
          thisRuntimeIntake ? 'PASS' : 'BLOCKED',
          thisRuntimeIntake
            ? 'Die Pflichtnamen INBOUND_KFZ_INTAKE_SECRET, INBOUND_KFZ_AGENCY_ID (oder INBOUND_EMAIL_AGENCY_ID) und INBOUND_KFZ_ACTOR_USER_ID (oder INBOUND_EMAIL_ACTOR_USER_ID) sind in diesem Prozess gesetzt. Werte werden nicht angezeigt. Production bleibt unbestätigt.'
            : `In diesem Prozess fehlen: ${missingIntake.join(', ') || 'INBOUND_KFZ_INTAKE_SECRET, INBOUND_KFZ_AGENCY_ID, INBOUND_KFZ_ACTOR_USER_ID'}. Der Handler antwortet dann mit config_missing.`,
          [
            envRef('INBOUND_KFZ_INTAKE_SECRET'),
            envRef('INBOUND_KFZ_AGENCY_ID'),
            envRef('INBOUND_KFZ_ACTOR_USER_ID'),
            DOC_ENV_EXAMPLE,
            DOC_LOCAL_TEST,
          ],
        ),
        fact(
          'production_submit',
          'Production-Submit und Replay',
          'NOT_VERIFIED',
          'Ob Preview/Production denselben Idempotenz-Pfad persistiert, ist hier nicht geprüft.',
          [ROUTE_INTAKE_API, DOC_LOCAL_TEST],
        ),
      ],
    },
    {
      id: 'normalized_inbox',
      title: 'Normalisierter Inbox-Eingang',
      summary: 'Website-Kfz wird zur bestehenden Inbox, nicht in eine zweite Lead-Datenbank.',
      facts: [
        fact(
          'inbox_code',
          'Lokaler Inbox-Pfad ist eingecheckt',
          inboxFile && reviewFile ? 'PASS' : 'BLOCKED',
          inboxFile && reviewFile
            ? 'Intake erzeugt ein InboundItem mit channel/source=website. Operator-Sicht: /app/inbox.'
            : 'Inbox-Route oder Kfz-Review-Präsentation fehlt.',
          [
            ROUTE_INBOX,
            ROUTE_INTAKE_API,
            codeRef('src/features/inbox/lib/present-kfz-website-inbox.ts'),
          ],
        ),
        fact(
          'document_bytes',
          'Dauerhafte Dokument-Bytes',
          'BLOCKED',
          KFZ_LANDING_STORAGE_BLOCKER,
          [
            ROUTE_LANDING,
            codeRef('src/features/inbound/kfz/lib/kfz-landing-documents.ts'),
            DOC_LOCAL_TEST,
          ],
        ),
      ],
    },
    {
      id: 'manual_review',
      title: 'Manuelle Prüfung',
      summary: 'Menschliche Sichtung in der bestehenden Inbox. Kein automatischer Versand.',
      facts: [
        fact(
          'review_path',
          'Prüfschirm und manuelle Aktionen sind vorhanden',
          inboxFile && triageFile ? 'PASS' : 'BLOCKED',
          inboxFile && triageFile
            ? 'presentKfzWebsiteInboxItem + applyKfzManualTriageCommand. Nächster Schritt bleibt intern. Nichts wird automatisch gesendet.'
            : 'Inbox-Prüfpfad oder Triage-Aktionen fehlen.',
          [
            ROUTE_INBOX,
            codeRef('src/features/inbox/lib/kfz-inbox-manual-triage.ts'),
            codeRef('src/features/inbox/components/inbox-kfz-review-section.tsx'),
          ],
        ),
      ],
    },
    {
      id: 'analytics',
      title: 'Analytics-Speicherung und Dashboard',
      summary: 'First-party Messung nur nach Consent. Kein Pixel, keine Formularantworten.',
      facts: [
        fact(
          'analytics_code',
          'Lokaler Analytics-Vertrag ist eingecheckt',
          analyticsFile && analyticsApiFile && ingestFile && privacyFile ? 'PASS' : 'BLOCKED',
          analyticsFile && analyticsApiFile && ingestFile && privacyFile
            ? 'Consent, Redaction, Ingest und /app/kfz-analytics sind vorhanden. Declined speichert lokal nichts. Das ist keine Rechtsaussage.'
            : 'Analytics-Dashboard, Ingest oder Privacy-Grenze fehlt.',
          [
            ROUTE_ANALYTICS,
            ROUTE_ANALYTICS_API,
            ROUTE_LANDING,
            codeRef('src/features/inbound/kfz/lib/kfz-analytics-ingest.ts'),
            codeRef('src/features/inbound/kfz/lib/kfz-analytics-privacy-boundary.ts'),
          ],
        ),
        fact(
          'analytics_legal',
          'Rechtstext, Rechtsgrundlage, Retention',
          'OWNER_INPUT',
          'Die Privacy-Grenze ist ein Engineering-Vertrag. Datenschutzerklärung, Rechtsgrundlage und Aufbewahrung bleiben Owner/Legal.',
          [
            codeRef('src/features/inbound/kfz/lib/kfz-analytics-privacy-boundary.ts'),
            { kind: 'route', label: '/datenschutz', href: '/datenschutz' },
            DOC_LOCAL_TEST,
          ],
        ),
      ],
    },
    {
      id: 'migrations_configuration',
      title: 'Migrationen und Konfiguration',
      summary: 'Eingecheckte SQL-Dateien und Variablennamen. Apply und Production-Secrets sind getrennt.',
      facts: [
        fact(
          'migrations_checked_in',
          'Pflicht-Migrationen sind im Repository',
          migrationsPresent ? 'PASS' : 'BLOCKED',
          migrationsPresent
            ? '20260906120000_inbox_website_channel_source.sql und 20260909140000_kfz_funnel_analytics_events.sql sind eingecheckt. Apply auf Preview/Production ist das nicht.'
            : 'Mindestens eine Kfz-Pflichtmigration fehlt im Repository.',
          KFZ_LAUNCH_REQUIRED_MIGRATIONS.map((entry) => migrationRef(entry.file)),
        ),
        fact(
          'migrations_applied',
          'Migrationen auf Preview/Staging/Production anwenden',
          'OWNER_INPUT',
          'Apply bleibt Owner-Entscheidung. Diese Seite prüft keine Remote-Datenbank.',
          [...KFZ_LAUNCH_REQUIRED_MIGRATIONS.map((entry) => migrationRef(entry.file)), DOC_LOCAL_TEST],
        ),
        fact(
          'this_runtime_persist',
          'Dieses Prozess-Environment hat Persistenz-Variablen gesetzt',
          thisRuntimePersist ? 'PASS' : 'BLOCKED',
          thisRuntimePersist
            ? 'NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY sind in diesem Prozess gesetzt. Werte werden nicht angezeigt. Ob Production dieselben Namen trägt, ist unbestätigt.'
            : 'NEXT_PUBLIC_SUPABASE_URL und/oder SUPABASE_SERVICE_ROLE_KEY fehlen in diesem Prozess. Live-Persistenz aus diesem Prozess ist blockiert.',
          [
            envRef('NEXT_PUBLIC_SUPABASE_URL'),
            envRef('SUPABASE_SERVICE_ROLE_KEY'),
            DOC_ENV_EXAMPLE,
          ],
        ),
        fact(
          'env_docs',
          'Variablennamen sind dokumentiert',
          docsFile && envExampleFile ? 'PASS' : 'BLOCKED',
          docsFile && envExampleFile
            ? 'Namen stehen in .env.example und docs/kfz-inbound-local-test.md. Keine Werte auf dieser Seite.'
            : 'Dokumentation der Env-Namen fehlt.',
          [DOC_ENV_EXAMPLE, DOC_LOCAL_TEST],
        ),
        fact(
          'rate_limit_store',
          'Production Rate-Limit Store',
          'OWNER_INPUT',
          'consumeRateLimit ist ein In-Memory-Seam. Shared Store für Production ist Follow-up.',
          [
            codeRef('src/features/inbound/kfz/lib/rate-limit-seam.ts'),
            envRef('INBOUND_KFZ_RATE_LIMIT_MAX'),
            DOC_LOCAL_TEST,
          ],
        ),
      ],
    },
    {
      id: 'production_unknowns',
      title: 'Nur in Production unbekannt',
      summary: 'Diese Punkte können lokale Fixtures nicht beweisen. Kein PASS aus dieser Seite.',
      facts: [
        fact(
          'production_env',
          'Production-Secrets und Agency-IDs',
          'NOT_VERIFIED',
          'Ob Production INBOUND_KFZ_* und Supabase-Keys gesetzt hat, wird hier nicht geprüft. Werte werden nie angezeigt.',
          [
            envRef('INBOUND_KFZ_INTAKE_SECRET'),
            envRef('INBOUND_KFZ_AGENCY_ID'),
            envRef('INBOUND_KFZ_ACTOR_USER_ID'),
            envRef('SUPABASE_SERVICE_ROLE_KEY'),
            DOC_ENV_EXAMPLE,
          ],
        ),
        fact(
          'production_data',
          'Production-Daten und Live-Traffic',
          'NOT_VERIFIED',
          'Keine Live-Anfragen, keine Production-Inbox, keine Production-Messdaten in dieser Bewertung.',
          [ROUTE_INBOX, ROUTE_ANALYTICS, DOC_LOCAL_TEST],
        ),
        fact(
          'campaign_ads',
          'Werbung, Meta/WhatsApp-API, Kundenkontakt',
          'OWNER_INPUT',
          'Nicht Teil dieser Strecke. Kein Pixel, keine Kampagne, kein automatischer Kundenkontakt in diesem Slice.',
          [DOC_LOCAL_TEST, ROUTE_READINESS],
        ),
        fact(
          'tariff_legal_retention',
          'Tarif, Rechtstext, Retention/Löschung',
          'OWNER_INPUT',
          'Keine Tarifberechnung. Retention/Löschung und rechtliche Freigabe bleiben Owner.',
          [DOC_LOCAL_TEST, { kind: 'route', label: '/datenschutz', href: '/datenschutz' }],
        ),
      ],
    },
  ]

  return {
    generatedAt: input.nowIso ?? new Date().toISOString(),
    scope: 'local_code_contract',
    productionClaim: false,
    disclaimer: KFZ_LAUNCH_READINESS_DISCLAIMER,
    headline: KFZ_LAUNCH_READINESS_HEADLINE,
    counts: countFacts(items),
    env: envSnapshot,
    files,
    items,
  }
}

export function listKfzLaunchReadinessFacts(
  report: KfzLaunchReadinessReport,
): KfzLaunchReadinessFact[] {
  return report.items.flatMap((item) => [...item.facts])
}

export function kfzLaunchReadinessHasProductionClaim(report: KfzLaunchReadinessReport): boolean {
  if (report.productionClaim !== false) {
    return true
  }
  const blob = JSON.stringify(report).toLowerCase()
  return (
    blob.includes('produktionsbereit') ||
    blob.includes('production ready') ||
    blob.includes('ready for production') ||
    blob.includes('freigegeben für production') ||
    blob.includes('launch approved')
  )
}
