/**
 * Deterministic Kfz Supabase configuration preflight:
 * named env present/missing, private bucket contract, server-only service-role,
 * fail-closed persist, and secret redaction. Never prints values.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import {
  evaluateKfzSupabasePreflight,
  formatKfzSupabasePreflightReport,
  inspectKfzPrivateBucketMigration,
  inspectKfzServiceRoleUsage,
  kfzSupabasePreflightContainsHiddenValue,
  kfzSupabasePreflightHasProductionClaim,
  KFZ_SUPABASE_DOCUMENTS_MIGRATION,
  KFZ_SUPABASE_OWNER_CHECKLIST,
  KFZ_SUPABASE_PREFLIGHT_COMMAND,
  KFZ_SUPABASE_PREFLIGHT_DISCLAIMER,
  KFZ_SUPABASE_RELATED_MIGRATIONS,
  KFZ_SUPABASE_SERVICE_ROLE_ALLOWLIST,
  redactHiddenEnvValues,
  renderKfzSupabasePreflight,
} from '@/features/inbound/kfz/lib/kfz-supabase-preflight'
import {
  isKfzSupabasePersistConfigured,
  kfzSupabasePersistFailClosed,
  KFZ_SUPABASE_PERSIST_MISSING_ERROR,
  snapshotKfzSupabasePersistEnv,
} from '@/features/inbound/kfz/lib/kfz-supabase-persist-env'
import { KFZ_LAUNCH_REQUIRED_BRANCH_IDS } from '@/features/inbound/kfz/lib/kfz-launch-readiness'
import { KFZ_LANDING_BRANCHES } from '@/features/inbound/kfz/lib/kfz-questionnaire'
import { createServiceRoleKfzDocumentStore } from '@/features/inbound/kfz/repositories/kfz-document-store'
import { KFZ_INBOUND_DOCUMENTS_BUCKET } from '@/features/inbound/kfz/types/kfz-document-storage'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

const HIDDEN_URL = 'https://preflight-secret-host.example.supabase.co'
const HIDDEN_KEY = 'service-role-do-not-print-preflight'
const HIDDEN_SECRET = 'intake-secret-do-not-print-preflight'

function configuredEnv(): Record<string, string> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: HIDDEN_URL,
    SUPABASE_SERVICE_ROLE_KEY: HIDDEN_KEY,
    INBOUND_KFZ_INTAKE_SECRET: HIDDEN_SECRET,
    INBOUND_KFZ_AGENCY_ID: '11111111-1111-4111-8111-111111111111',
    INBOUND_KFZ_ACTOR_USER_ID: '22222222-2222-4222-8222-222222222222',
  }
}

describe('kfz supabase persist env names', () => {
  it('reports configured and missing states without values', () => {
    const configured = snapshotKfzSupabasePersistEnv(configuredEnv())
    assert.deepEqual(
      configured.map((entry) => entry.name),
      ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    )
    assert.equal(configured.every((entry) => entry.present), true)
    assert.equal(isKfzSupabasePersistConfigured(configuredEnv()), true)
    assert.equal(JSON.stringify(configured).includes(HIDDEN_KEY), false)
    assert.equal(JSON.stringify(configured).includes(HIDDEN_URL), false)

    const missing = snapshotKfzSupabasePersistEnv({})
    assert.equal(missing.every((entry) => entry.present === false), true)
    assert.equal(isKfzSupabasePersistConfigured({}), false)

    const blocked = kfzSupabasePersistFailClosed({})
    assert.equal(blocked.allowsStore, false)
    assert.equal(blocked.error, KFZ_SUPABASE_PERSIST_MISSING_ERROR)
    assert.deepEqual(blocked.missing, [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ])
    assert.equal(JSON.stringify(blocked).includes(HIDDEN_KEY), false)
  })
})

describe('kfz supabase preflight evaluation', () => {
  it('passes the local contract when persist names are configured and redacts secrets', () => {
    assert.deepEqual(
      KFZ_LANDING_BRANCHES.map((branch) => branch.id),
      [...KFZ_LAUNCH_REQUIRED_BRANCH_IDS],
    )

    const report = evaluateKfzSupabasePreflight({
      nowIso: '2026-09-10T21:00:00.000Z',
      repoRoot,
      env: configuredEnv(),
    })

    assert.equal(report.command, KFZ_SUPABASE_PREFLIGHT_COMMAND)
    assert.equal(report.productionClaim, false)
    assert.equal(report.appliesMigrations, false)
    assert.equal(report.deploys, false)
    assert.equal(report.scope, 'local_code_contract')
    assert.equal(report.disclaimer, KFZ_SUPABASE_PREFLIGHT_DISCLAIMER)
    assert.equal(report.contractOk, true)
    assert.equal(report.thisProcessConfigured, true)
    assert.equal(kfzSupabasePreflightHasProductionClaim(report), false)

    const byId = Object.fromEntries(report.checks.map((check) => [check.id, check]))
    assert.equal(byId.required_env_names?.status, 'PASS')
    assert.equal(byId.private_bucket_migration?.status, 'PASS')
    assert.equal(byId.server_only_service_role?.status, 'PASS')
    assert.equal(byId.fail_closed?.status, 'PASS')
    assert.equal(byId.public_bucket_disabled?.status, 'PASS')
    assert.equal(byId.review_authz?.status, 'PASS')
    assert.equal(byId.exact_once_retry?.status, 'PASS')
    assert.equal(byId.analytics_no_document_pii?.status, 'PASS')
    assert.equal(byId.six_branches_preserved?.status, 'PASS')
    assert.equal(byId.owner_apply?.status, 'OWNER_INPUT')
    assert.equal(byId.production_apply_unverified?.status, 'NOT_VERIFIED')

    const rendered = renderKfzSupabasePreflight(report, configuredEnv())
    assert.doesNotMatch(rendered, /service-role-do-not-print-preflight/)
    assert.doesNotMatch(rendered, /intake-secret-do-not-print-preflight/)
    assert.doesNotMatch(rendered, /preflight-secret-host/)
    assert.match(rendered, /NEXT_PUBLIC_SUPABASE_URL\s+present/)
    assert.match(rendered, /SUPABASE_SERVICE_ROLE_KEY\s+present/)
    assert.match(rendered, /npm run preflight:kfz-supabase/)
    assert.equal(kfzSupabasePreflightContainsHiddenValue(rendered, configuredEnv()), false)
    assert.match(rendered, /kfz-inbound-documents/)
    assert.match(rendered, /OWNER INPUT/)
  })

  it('marks this-process persist as BLOCKED when required names are absent', () => {
    const report = evaluateKfzSupabasePreflight({
      repoRoot,
      env: {},
    })

    const persist = report.checks.find((check) => check.id === 'required_env_names')
    assert.equal(persist?.status, 'BLOCKED')
    assert.match(persist?.detail ?? '', /NEXT_PUBLIC_SUPABASE_URL/)
    assert.match(persist?.detail ?? '', /SUPABASE_SERVICE_ROLE_KEY/)
    assert.equal(report.thisProcessConfigured, false)
    assert.equal(report.contractOk, true)
    assert.equal(report.checks.find((check) => check.id === 'fail_closed')?.status, 'PASS')
    assert.equal(report.checks.find((check) => check.id === 'owner_apply')?.status, 'OWNER_INPUT')

    const rendered = formatKfzSupabasePreflightReport(report)
    assert.match(rendered, /NEXT_PUBLIC_SUPABASE_URL\s+missing/)
    assert.match(rendered, /SUPABASE_SERVICE_ROLE_KEY\s+missing/)
    assert.doesNotMatch(rendered, /Bearer /)
    assert.doesNotMatch(rendered, /eyJ/)
  })

  it('keeps one exact owner checklist on existing Supabase and Vercel only', () => {
    assert.equal(KFZ_SUPABASE_OWNER_CHECKLIST.length, 4)
    const tools = new Set(KFZ_SUPABASE_OWNER_CHECKLIST.map((step) => step.tool))
    assert.deepEqual([...tools].sort(), ['Supabase', 'Vercel'])
    const blob = JSON.stringify(KFZ_SUPABASE_OWNER_CHECKLIST)
    assert.doesNotMatch(blob, /aws|gcp|azure|stripe|new paid|meta|whatsapp/i)
    assert.match(blob, /kfz-inbound-documents/)
    assert.match(blob, /SUPABASE_SERVICE_ROLE_KEY/)
    assert.match(blob, /Settings → Environment Variables/)
    assert.doesNotMatch(blob, /service-role-do-not-print/)
  })
})

describe('kfz supabase private-storage and secret-redaction contract', () => {
  it('checks in the private bucket migration and server-only service-role allowlist', () => {
    for (const file of KFZ_SUPABASE_RELATED_MIGRATIONS) {
      assert.equal(fs.existsSync(path.join(repoRoot, file)), true, file)
    }
    const bucket = inspectKfzPrivateBucketMigration(repoRoot)
    assert.equal(bucket.ok, true)
    assert.match(bucket.detail, new RegExp(KFZ_INBOUND_DOCUMENTS_BUCKET))
    assert.match(bucket.detail, new RegExp(KFZ_SUPABASE_DOCUMENTS_MIGRATION.replace('.', '\\.')))

    const usage = inspectKfzServiceRoleUsage(repoRoot)
    assert.equal(usage.ok, true, usage.leaked.join(', '))
    assert.ok(
      KFZ_SUPABASE_SERVICE_ROLE_ALLOWLIST.includes(
        'src/features/inbound/kfz/repositories/kfz-document-store.ts',
      ),
    )

    const client = fs.readFileSync(path.join(repoRoot, 'src/lib/supabase/client.ts'), 'utf8')
    assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY/)
    assert.doesNotMatch(client, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/)
  })

  it('redacts secret-like values even if they appear in free text', () => {
    const env = configuredEnv()
    const leaked = `url=${HIDDEN_URL} key=${HIDDEN_KEY} token=${HIDDEN_SECRET}`
    const redacted = redactHiddenEnvValues(leaked, env)
    assert.doesNotMatch(redacted, /preflight-secret-host/)
    assert.doesNotMatch(redacted, /service-role-do-not-print-preflight/)
    assert.doesNotMatch(redacted, /intake-secret-do-not-print-preflight/)
    assert.match(redacted, /\[redacted\]/)
  })

  it('fails closed without constructing a usable store when persist names are missing', () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    try {
      assert.throws(
        () => createServiceRoleKfzDocumentStore(),
        (error: unknown) => {
          assert.ok(error instanceof Error)
          assert.equal(error.message, KFZ_SUPABASE_PERSIST_MISSING_ERROR)
          assert.doesNotMatch(error.message, /eyJ|Bearer |service-role-do-not-print/i)
          return true
        },
      )
    } finally {
      if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl
      if (prevKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
      else process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey
    }
  })

  it('returns store_unavailable when documents need persist names that are absent', async () => {
    const prev = {
      agency: process.env.INBOUND_KFZ_AGENCY_ID,
      actor: process.env.INBOUND_KFZ_ACTOR_USER_ID,
      secret: process.env.INBOUND_KFZ_INTAKE_SECRET,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
    process.env.INBOUND_KFZ_AGENCY_ID = '11111111-1111-4111-8111-111111111111'
    process.env.INBOUND_KFZ_ACTOR_USER_ID = '22222222-2222-4222-8222-222222222222'
    process.env.INBOUND_KFZ_INTAKE_SECRET = HIDDEN_SECRET
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    try {
      const result = await handleKfzInboundHttpRequest(
        new Request('http://localhost/api/inbound/kfz', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${HIDDEN_SECRET}`,
            'content-type': 'application/json',
          },
          body: '{}',
        }),
        {
          documents: [
            {
              filename: 'schein.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 8,
              group: 'fahrzeugschein',
              bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9, 1, 2, 3, 4]).buffer,
            },
          ],
        },
      )
      assert.equal(result.ok, false)
      if (!result.ok) {
        assert.equal(result.status, 503)
        assert.equal(result.body.code, 'store_unavailable')
        assert.doesNotMatch(result.body.error, /service-role-do-not-print|eyJ|Bearer /)
      }
    } finally {
      if (prev.agency === undefined) delete process.env.INBOUND_KFZ_AGENCY_ID
      else process.env.INBOUND_KFZ_AGENCY_ID = prev.agency
      if (prev.actor === undefined) delete process.env.INBOUND_KFZ_ACTOR_USER_ID
      else process.env.INBOUND_KFZ_ACTOR_USER_ID = prev.actor
      if (prev.secret === undefined) delete process.env.INBOUND_KFZ_INTAKE_SECRET
      else process.env.INBOUND_KFZ_INTAKE_SECRET = prev.secret
      if (prev.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prev.url
      if (prev.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
      else process.env.SUPABASE_SERVICE_ROLE_KEY = prev.key
    }
  })
})
