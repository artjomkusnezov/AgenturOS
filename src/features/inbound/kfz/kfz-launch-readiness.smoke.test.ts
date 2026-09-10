/**
 * Internal Kfz launch-readiness checklist: factual statuses, no secret values,
 * no production claim from local fixtures.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { appNavigation } from '@/config/app-navigation'
import {
  evaluateKfzLaunchReadiness,
  inspectKfzLaunchFiles,
  kfzLaunchReadinessHasProductionClaim,
  KFZ_LAUNCH_READINESS_DISCLAIMER,
  KFZ_LAUNCH_REQUIRED_BRANCH_IDS,
  KFZ_LAUNCH_REQUIRED_FILES,
  KFZ_LAUNCH_REQUIRED_MIGRATIONS,
  listKfzLaunchReadinessFacts,
  snapshotKfzLaunchEnvPresence,
} from '@/features/inbound/kfz/lib/kfz-launch-readiness'
import { KFZ_LANDING_STORAGE_NOTICE } from '@/features/inbound/kfz/lib/kfz-landing-documents'
import { KFZ_LANDING_BRANCHES } from '@/features/inbound/kfz/lib/kfz-questionnaire'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const srcRoot = path.join(repoRoot, 'src')

function readSrc(relativeFromSrc: string): string {
  return fs.readFileSync(path.join(srcRoot, relativeFromSrc), 'utf8')
}

describe('kfz launch readiness evaluation', () => {
  it('keeps the six approved branches and never claims production readiness', () => {
    assert.deepEqual(
      KFZ_LANDING_BRANCHES.map((branch) => branch.id),
      [...KFZ_LAUNCH_REQUIRED_BRANCH_IDS],
    )

    const report = evaluateKfzLaunchReadiness({
      nowIso: '2026-09-10T06:00:00.000Z',
      repoRoot,
      env: {
        INBOUND_KFZ_INTAKE_SECRET: 'local-only-secret-do-not-print',
        INBOUND_KFZ_AGENCY_ID: '11111111-1111-4111-8111-111111111111',
        INBOUND_KFZ_ACTOR_USER_ID: '22222222-2222-4222-8222-222222222222',
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-do-not-print',
      },
    })

    assert.equal(report.productionClaim, false)
    assert.equal(report.scope, 'local_code_contract')
    assert.equal(report.disclaimer, KFZ_LAUNCH_READINESS_DISCLAIMER)
    assert.equal(kfzLaunchReadinessHasProductionClaim(report), false)
    assert.match(report.disclaimer, /Keine Produktionsfreigabe/)

    const serialized = JSON.stringify(report)
    assert.doesNotMatch(serialized, /local-only-secret-do-not-print/)
    assert.doesNotMatch(serialized, /service-role-do-not-print/)
    assert.match(serialized, /INBOUND_KFZ_INTAKE_SECRET/)
    assert.match(serialized, /20260906120000_inbox_website_channel_source\.sql/)
    assert.match(serialized, /20260909140000_kfz_funnel_analytics_events\.sql/)
    assert.match(serialized, /20260910120000_kfz_inbound_documents_bucket\.sql/)

    const facts = listKfzLaunchReadinessFacts(report)
    const statuses = new Set(facts.map((fact) => fact.status))
    assert.ok(statuses.has('PASS'))
    assert.ok(statuses.has('OWNER_INPUT'))
    assert.ok(statuses.has('NOT_VERIFIED'))

    const documentBytes = facts.find((fact) => fact.id === 'document_bytes')
    assert.ok(documentBytes)
    assert.equal(documentBytes.status, 'PASS')
    assert.ok(documentBytes.detail.includes(KFZ_LANDING_STORAGE_NOTICE))

    const productionSubmit = facts.find((fact) => fact.id === 'production_submit')
    assert.equal(productionSubmit?.status, 'NOT_VERIFIED')

    const domain = facts.find((fact) => fact.id === 'landing_domain')
    assert.equal(domain?.status, 'OWNER_INPUT')

    const thisRuntime = facts.find((fact) => fact.id === 'this_runtime_submit')
    assert.equal(thisRuntime?.status, 'PASS')

    assert.equal(report.items.some((item) => item.id === 'landing_route'), true)
    assert.equal(report.items.some((item) => item.id === 'six_branches'), true)
    assert.equal(report.items.some((item) => item.id === 'contact_consent_validation'), true)
    assert.equal(report.items.some((item) => item.id === 'submit_retry_idempotency'), true)
    assert.equal(report.items.some((item) => item.id === 'normalized_inbox'), true)
    assert.equal(report.items.some((item) => item.id === 'manual_review'), true)
    assert.equal(report.items.some((item) => item.id === 'analytics'), true)
    assert.equal(report.items.some((item) => item.id === 'migrations_configuration'), true)
    assert.equal(report.items.some((item) => item.id === 'supabase_preflight'), true)
    assert.equal(report.items.some((item) => item.id === 'production_unknowns'), true)

    const preflight = facts.find((fact) => fact.id === 'supabase_preflight_command')
    assert.equal(preflight?.status, 'PASS')
    assert.match(preflight?.detail ?? '', /preflight:kfz-supabase/)

    const ownerChecklist = facts.find((fact) => fact.id === 'supabase_owner_checklist')
    assert.equal(ownerChecklist?.status, 'OWNER_INPUT')
    assert.match(ownerChecklist?.detail ?? '', /Supabase/)
    assert.match(ownerChecklist?.detail ?? '', /Vercel/)
  })

  it('marks this-process intake as BLOCKED when required env names are absent', () => {
    const report = evaluateKfzLaunchReadiness({
      repoRoot,
      env: {},
    })
    const thisRuntime = listKfzLaunchReadinessFacts(report).find(
      (fact) => fact.id === 'this_runtime_submit',
    )
    assert.equal(thisRuntime?.status, 'BLOCKED')
    assert.match(thisRuntime?.detail ?? '', /INBOUND_KFZ_INTAKE_SECRET/)
    assert.doesNotMatch(JSON.stringify(report), /Bearer /)
  })

  it('inspects required files and env names without values', () => {
    const files = inspectKfzLaunchFiles(repoRoot)
    for (const required of KFZ_LAUNCH_REQUIRED_FILES) {
      const entry = files.find((file) => file.path === required)
      assert.ok(entry, required)
      assert.equal(entry.present, true, required)
    }
    for (const migration of KFZ_LAUNCH_REQUIRED_MIGRATIONS) {
      assert.equal(fs.existsSync(path.join(repoRoot, migration.file)), true)
    }

    const env = snapshotKfzLaunchEnvPresence({
      INBOUND_KFZ_INTAKE_SECRET: 'hidden',
    })
    const secret = env.find((entry) => entry.name === 'INBOUND_KFZ_INTAKE_SECRET')
    assert.equal(secret?.present, true)
    assert.equal(JSON.stringify(env).includes('hidden'), false)
  })
})

describe('kfz launch readiness surface', () => {
  it('is one internal AgenturOS page, not a parallel dashboard', () => {
    const nav = appNavigation.find((item) => item.href === '/app/kfz-readiness')
    assert.ok(nav)
    assert.equal(nav.title, 'Kfz-Startcheck')
    assert.match(nav.description ?? '', /keine Produktionsfreigabe/i)

    const analytics = appNavigation.find((item) => item.href === '/app/kfz-analytics')
    assert.ok(analytics)

    const page = readSrc('app/app/kfz-readiness/page.tsx')
    assert.match(page, /KfzLaunchReadinessView/)
    assert.match(page, /loadKfzLaunchReadinessAction/)

    const view = readSrc('features/inbound/kfz/components/kfz-launch-readiness-view.tsx')
    assert.match(view, /data-kfz-readiness-page/)
    assert.match(view, /Keine Produktionsfreigabe/)
    assert.match(view, /\/app\/inbox/)
    assert.match(view, /\/app\/kfz-analytics/)
    assert.match(view, /aosTextPageTitleClassName/)
    assert.match(view, /data-kfz-supabase-owner-checklist/)
    assert.match(view, /preflight:kfz-supabase/)
    assert.doesNotMatch(view, /Meta Pixel|gtag\(|facebook\.com\/tr/)

    const preview = readSrc('app/dev/kfz-readiness/page.tsx')
    assert.match(preview, /NODE_ENV === 'production'/)
    assert.match(preview, /notFound/)
    assert.match(preview, /aos-workspace-page/)
  })
})
