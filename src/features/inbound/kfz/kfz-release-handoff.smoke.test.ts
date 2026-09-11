/**
 * Secret-safe Kfz release handoff: stacked PR/commit chain, checked-in
 * migration order, routes, env names, commands, owner-only steps, no
 * forbidden values.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { appNavigation } from '@/config/app-navigation'
import {
  evaluateKfzLaunchReadiness,
  KFZ_LAUNCH_REQUIRED_BRANCH_IDS,
  KFZ_LAUNCH_REQUIRED_MIGRATIONS,
} from '@/features/inbound/kfz/lib/kfz-launch-readiness'
import { KFZ_LAUNCH_CHECK_IDS } from '@/features/inbound/kfz/types/kfz-launch-readiness'
import { KFZ_LANDING_BRANCHES } from '@/features/inbound/kfz/lib/kfz-questionnaire'
import { KFZ_SUPABASE_RELATED_MIGRATIONS } from '@/features/inbound/kfz/lib/kfz-supabase-preflight'
import {
  inspectKfzReleaseHandoff,
  kfzReleaseHandoffContainsForbiddenValue,
  kfzReleaseMigrationFiles,
  kfzReleaseMigrationsAreTimestampOrdered,
  kfzReleaseStackIsLinear,
  kfzReleaseStackedPrNumbers,
  listKfzReleaseHandoffForbiddenMatches,
  renderKfzReleaseHandoffMarkdown,
  KFZ_RELEASE_COMMANDS,
  KFZ_RELEASE_ENV_NAMES,
  KFZ_RELEASE_HANDOFF_BASE_BRANCH,
  KFZ_RELEASE_HANDOFF_BASE_PR,
  KFZ_RELEASE_HANDOFF_BRANCH,
  KFZ_RELEASE_HANDOFF_DISCLAIMER,
  KFZ_RELEASE_HANDOFF_DOC,
  KFZ_RELEASE_OWNER_STEPS,
  KFZ_RELEASE_PARALLEL_GATE2_PR,
  KFZ_RELEASE_PREVIEW_CHECKS,
  KFZ_RELEASE_PRESERVED_SURFACES,
  KFZ_RELEASE_READINESS_CHECK_IDS,
  KFZ_RELEASE_REQUIRED_MIGRATIONS,
  KFZ_RELEASE_REQUIRED_ROUTES,
  KFZ_RELEASE_STACK_BASE_BRANCH,
  KFZ_RELEASE_STACK_BASE_SHA,
  KFZ_RELEASE_STACKED_PRS,
  KFZ_RELEASE_STOP_CONDITIONS,
} from '@/features/inbound/kfz/lib/kfz-release-handoff'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const srcRoot = path.join(repoRoot, 'src')

function readSrc(relativeFromSrc: string): string {
  return fs.readFileSync(path.join(srcRoot, relativeFromSrc), 'utf8')
}

function isGitAncestor(sha: string, of: string = 'HEAD'): boolean {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', sha, of], {
      cwd: repoRoot,
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

const HIDDEN_SECRET = 'handoff-secret-do-not-print'
const HIDDEN_SERVICE_ROLE = 'handoff-service-role-do-not-print'
const HIDDEN_URL = 'https://handoff-secret-host.example.supabase.co'

describe('kfz release handoff contract', () => {
  it('keeps a linear merge-first stack whose tips are ancestors of HEAD', () => {
    assert.equal(kfzReleaseStackIsLinear(), true)
    assert.equal(KFZ_RELEASE_STACKED_PRS[0]?.baseRef, KFZ_RELEASE_STACK_BASE_BRANCH)
    assert.equal(
      KFZ_RELEASE_STACKED_PRS[KFZ_RELEASE_STACKED_PRS.length - 1]?.number,
      KFZ_RELEASE_HANDOFF_BASE_PR,
    )
    assert.equal(
      KFZ_RELEASE_STACKED_PRS[KFZ_RELEASE_STACKED_PRS.length - 1]?.headRef,
      KFZ_RELEASE_HANDOFF_BASE_BRANCH,
    )
    assert.equal(KFZ_RELEASE_HANDOFF_BRANCH.startsWith('cursor/'), true)
    assert.equal(KFZ_RELEASE_PARALLEL_GATE2_PR, 19)

    const numbers = kfzReleaseStackedPrNumbers()
    assert.deepEqual(numbers, [
      22, 24, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 44,
      45, 46, 47, 48, 49, 50, 51, 52, 53, 54,
    ])

    assert.equal(isGitAncestor(KFZ_RELEASE_STACK_BASE_SHA), true)
    for (let index = 0; index < KFZ_RELEASE_STACKED_PRS.length; index += 1) {
      const entry = KFZ_RELEASE_STACKED_PRS[index]
      assert.ok(entry)
      assert.equal(isGitAncestor(entry.tipSha), true, `#${entry.number} ${entry.tipSha}`)
      if (index > 0) {
        const previous = KFZ_RELEASE_STACKED_PRS[index - 1]
        assert.ok(previous)
        assert.equal(entry.baseRef, previous.headRef)
        assert.equal(
          isGitAncestor(previous.tipSha, entry.tipSha),
          true,
          `#${previous.number} tip must be ancestor of #${entry.number} tip`,
        )
      }
    }
  })

  it('lists required migrations in checked-in timestamp order with introducing commits', () => {
    assert.equal(kfzReleaseMigrationsAreTimestampOrdered(), true)
    assert.deepEqual(
      kfzReleaseMigrationFiles(),
      KFZ_LAUNCH_REQUIRED_MIGRATIONS.map((entry) => entry.file),
    )
    assert.deepEqual(kfzReleaseMigrationFiles(), [...KFZ_SUPABASE_RELATED_MIGRATIONS])

    for (const entry of KFZ_RELEASE_REQUIRED_MIGRATIONS) {
      assert.equal(fs.existsSync(path.join(repoRoot, entry.file)), true, entry.file)
      assert.equal(isGitAncestor(entry.introducingSha), true, entry.introducingSha)
    }

    assert.equal(KFZ_RELEASE_REQUIRED_MIGRATIONS[0]?.introducingPr, 19)
    assert.equal(KFZ_RELEASE_REQUIRED_MIGRATIONS[1]?.introducingPr, 40)
    assert.equal(KFZ_RELEASE_REQUIRED_MIGRATIONS[2]?.introducingPr, 45)
    assert.equal(KFZ_RELEASE_REQUIRED_MIGRATIONS[3]?.introducingPr, 53)
    assert.equal(
      kfzReleaseStackedPrNumbers().includes(40) &&
        kfzReleaseStackedPrNumbers().includes(45) &&
        kfzReleaseStackedPrNumbers().includes(53),
      true,
    )
  })

  it('lists routes that exist and keeps the six approved branches', () => {
    assert.deepEqual(
      KFZ_LANDING_BRANCHES.map((branch) => branch.id),
      [...KFZ_LAUNCH_REQUIRED_BRANCH_IDS],
    )
    assert.deepEqual([...KFZ_RELEASE_PRESERVED_SURFACES], [
      'six_kfz_branches',
      'questionnaire',
      'consent',
      'analytics',
      'private_storage',
      'inbox',
      'authorized_review',
    ])
    for (const route of KFZ_RELEASE_REQUIRED_ROUTES) {
      assert.equal(fs.existsSync(path.join(repoRoot, route.file)), true, route.file)
    }
    assert.deepEqual(
      [...KFZ_RELEASE_READINESS_CHECK_IDS],
      [...KFZ_LAUNCH_CHECK_IDS],
    )
  })

  it('keeps the checked-in markdown identical to the renderer and free of forbidden values', () => {
    const rendered = renderKfzReleaseHandoffMarkdown()
    const onDisk = fs.readFileSync(path.join(repoRoot, KFZ_RELEASE_HANDOFF_DOC), 'utf8')
    assert.equal(onDisk, rendered)

    const inspection = inspectKfzReleaseHandoff(repoRoot)
    assert.equal(inspection.status, 'PASS')
    assert.equal(inspection.present, true)
    assert.equal(inspection.matchesRenderer, true)
    assert.equal(inspection.migrationsMatch, true)
    assert.equal(inspection.routesMatch, true)

    assert.match(rendered, /Keine Produktionsfreigabe/)
    assert.equal(rendered.includes(KFZ_RELEASE_HANDOFF_DISCLAIMER), true)
    assert.doesNotMatch(rendered, /production ready|launch approved|Produktionsbereit/i)

    for (const entry of KFZ_RELEASE_REQUIRED_MIGRATIONS) {
      assert.equal(rendered.includes(path.basename(entry.file)), true)
    }
    for (const route of KFZ_RELEASE_REQUIRED_ROUTES) {
      assert.equal(rendered.includes(route.href), true)
      assert.equal(rendered.includes(route.file), true)
    }
    for (const env of KFZ_RELEASE_ENV_NAMES) {
      assert.equal(rendered.includes(`\`${env.name}\``), true)
    }
    for (const command of KFZ_RELEASE_COMMANDS) {
      assert.equal(rendered.includes(command.command), true)
    }
    assert.equal(KFZ_RELEASE_OWNER_STEPS.length > 0, true)
    assert.equal(KFZ_RELEASE_STOP_CONDITIONS.length > 0, true)
    assert.equal(KFZ_RELEASE_PREVIEW_CHECKS.length > 0, true)

    assert.deepEqual(listKfzReleaseHandoffForbiddenMatches(rendered), [])
    assert.equal(
      kfzReleaseHandoffContainsForbiddenValue(rendered, {
        INBOUND_KFZ_INTAKE_SECRET: HIDDEN_SECRET,
        SUPABASE_SERVICE_ROLE_KEY: HIDDEN_SERVICE_ROLE,
        NEXT_PUBLIC_SUPABASE_URL: HIDDEN_URL,
      }),
      false,
    )
    assert.doesNotMatch(rendered, /eyJ|Bearer /)
    assert.doesNotMatch(rendered, /Mustermann|synthetic\.pdf|@example\./)
    assert.doesNotMatch(rendered, /handoff-secret-do-not-print|handoff-service-role-do-not-print/)
  })

  it('surfaces the handoff on the existing readiness screen without a production claim', () => {
    const report = evaluateKfzLaunchReadiness({
      nowIso: '2026-09-11T08:00:00.000Z',
      repoRoot,
      env: {
        INBOUND_KFZ_INTAKE_SECRET: HIDDEN_SECRET,
        INBOUND_KFZ_AGENCY_ID: '11111111-1111-4111-8111-111111111111',
        INBOUND_KFZ_ACTOR_USER_ID: '22222222-2222-4222-8222-222222222222',
        NEXT_PUBLIC_SUPABASE_URL: HIDDEN_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'handoff-publishable-do-not-print',
        SUPABASE_SERVICE_ROLE_KEY: HIDDEN_SERVICE_ROLE,
      },
    })

    assert.equal(report.productionClaim, false)
    assert.equal(report.handoff.status, 'PASS')
    assert.equal(report.items.some((item) => item.id === 'release_handoff'), true)
    const facts = report.items.find((item) => item.id === 'release_handoff')?.facts ?? []
    assert.equal(facts.find((fact) => fact.id === 'handoff_document')?.status, 'PASS')
    assert.equal(facts.find((fact) => fact.id === 'handoff_migration_order')?.status, 'PASS')
    assert.equal(facts.find((fact) => fact.id === 'handoff_routes')?.status, 'PASS')
    assert.equal(facts.find((fact) => fact.id === 'handoff_owner_release')?.status, 'OWNER_INPUT')

    const serialized = JSON.stringify(report)
    assert.doesNotMatch(serialized, /handoff-secret-do-not-print/)
    assert.doesNotMatch(serialized, /handoff-service-role-do-not-print/)
    assert.doesNotMatch(serialized, /handoff-publishable-do-not-print/)
    assert.doesNotMatch(serialized, /handoff-secret-host/)

    const nav = appNavigation.find((item) => item.href === '/app/kfz-readiness')
    assert.ok(nav)

    const view = readSrc('features/inbound/kfz/components/kfz-launch-readiness-view.tsx')
    assert.match(view, /data-kfz-release-handoff/)
    assert.match(view, /data-kfz-release-handoff-stack/)
    assert.match(view, /data-kfz-release-handoff-migrations/)
    assert.doesNotMatch(view, /Meta Pixel|gtag\(|facebook\.com\/tr/)
  })
})
