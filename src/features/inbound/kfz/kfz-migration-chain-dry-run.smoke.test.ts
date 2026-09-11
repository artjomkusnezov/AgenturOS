/**
 * Test-only Kfz migration-chain dry run: empty + legacy in-memory databases,
 * two apply passes, private bucket, inbox linkage, review, allow-list,
 * unique retry, no public reads. Synthetic data only; reports stay nameless.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import {
  kfzMigrationChainReportLeaks,
  listKfzMigrationChainForbiddenReportValues,
  runKfzMigrationChainDryRun,
} from '@/features/inbound/kfz/lib/kfz-migration-chain-dry-run'
import { KFZ_LAUNCH_REQUIRED_BRANCH_IDS } from '@/features/inbound/kfz/lib/kfz-launch-readiness'
import { KFZ_LANDING_BRANCHES } from '@/features/inbound/kfz/lib/kfz-questionnaire'
import { KFZ_SUPABASE_RELATED_MIGRATIONS } from '@/features/inbound/kfz/lib/kfz-supabase-preflight'
import {
  KFZ_MIGRATION_CHAIN_CHECK_IDS,
  KFZ_MIGRATION_CHAIN_ENGINE,
  KFZ_MIGRATION_CHAIN_SCOPE,
  KFZ_MIGRATION_CHAIN_TARGETS,
} from '@/features/inbound/kfz/types/kfz-migration-chain-dry-run'

describe('kfz migration chain dry-run harness', () => {
  it('applies the checked-in chain twice on empty and legacy test databases', async () => {
    assert.deepEqual(
      KFZ_LANDING_BRANCHES.map((branch) => branch.id),
      [...KFZ_LAUNCH_REQUIRED_BRANCH_IDS],
    )

    const report = await runKfzMigrationChainDryRun()

    assert.equal(report.scope, KFZ_MIGRATION_CHAIN_SCOPE)
    assert.equal(report.engine, KFZ_MIGRATION_CHAIN_ENGINE)
    assert.equal(report.productionClaim, false)
    assert.equal(report.appliesRemote, false)
    assert.equal(report.ok, true)
    assert.deepEqual(
      report.targets.map((entry) => entry.target),
      [...KFZ_MIGRATION_CHAIN_TARGETS],
    )
    assert.equal(report.targets.length, 2)
    assert.equal(
      report.targets.every((entry) => entry.ok && entry.applyPasses === 2),
      true,
    )

    for (const target of report.targets) {
      assert.deepEqual(
        target.checks.map((entry) => entry.id),
        [...KFZ_MIGRATION_CHAIN_CHECK_IDS],
      )
      assert.equal(target.checks.every((entry) => entry.ok), true)
    }

    assert.equal(report.preserved.routes, true)
    assert.equal(report.preserved.sixBranches, true)
    assert.equal(report.preserved.questionnaire, true)
    assert.equal(report.preserved.consent, true)
    assert.equal(report.preserved.readiness, true)
    assert.equal(report.preserved.analyticsUi, true)

    const serialized = JSON.stringify(report)
    assert.equal(kfzMigrationChainReportLeaks(report).length, 0)
    for (const value of listKfzMigrationChainForbiddenReportValues()) {
      assert.equal(serialized.includes(value), false)
    }
    assert.doesNotMatch(serialized, /https?:\/\//)
    assert.doesNotMatch(serialized, /eyJ|Bearer /)
    assert.doesNotMatch(serialized, /Mustermann|@example\.|whatsapp\.com\/api|graph\.facebook/)
    assert.match(serialized, /20260906120000_inbox_website_channel_source\.sql/)
    assert.match(serialized, /20260910120000_kfz_inbound_documents_bucket\.sql/)
  })

  it('keeps checked-in Kfz migrations additive and re-runnable', () => {
    for (const relative of KFZ_SUPABASE_RELATED_MIGRATIONS) {
      assert.equal(fs.existsSync(path.join(process.cwd(), relative)), true, relative)
    }

    const website = fs.readFileSync(
      path.join(process.cwd(), KFZ_SUPABASE_RELATED_MIGRATIONS[0]!),
      'utf8',
    )
    const analytics = fs.readFileSync(
      path.join(process.cwd(), KFZ_SUPABASE_RELATED_MIGRATIONS[1]!),
      'utf8',
    )
    const documents = fs.readFileSync(
      path.join(process.cwd(), KFZ_SUPABASE_RELATED_MIGRATIONS[2]!),
      'utf8',
    )
    const contract = fs.readFileSync(
      path.join(process.cwd(), KFZ_SUPABASE_RELATED_MIGRATIONS[3]!),
      'utf8',
    )

    assert.match(website, /drop constraint if exists/i)
    assert.match(analytics, /create table if not exists/i)
    assert.match(analytics, /create unique index if not exists/i)
    assert.match(analytics, /drop policy if exists/i)
    assert.match(documents, /on conflict \(id\) do update/i)
    assert.match(documents, /public = false/)
    assert.match(contract, /create or replace function/i)
    assert.match(contract, /if not exists/i)
    assert.doesNotMatch(analytics, /\bdrop table\b/i)
    assert.doesNotMatch(contract, /\bdrop table\b/i)
    assert.doesNotMatch(documents, /to anon/)
    assert.doesNotMatch(documents, /to authenticated/)
  })
})
