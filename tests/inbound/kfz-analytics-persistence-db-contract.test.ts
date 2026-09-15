/**
 * Database-contract regression for privacy-safe Kfz analytics persistence.
 *
 * Asserts that checked-in Supabase migrations accept only approved aggregate
 * metadata and keep RLS narrowly allow-listed. Does not connect to or mutate
 * any database.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import {
  KFZ_ANALYTICS_ALLOWED_UTM_CAMPAIGNS,
  KFZ_ANALYTICS_ALLOWED_UTM_SOURCES,
  KFZ_ANALYTICS_BRANCH_IDS,
  KFZ_ANALYTICS_FIELD_IDS,
  KFZ_ANALYTICS_STEP_IDS,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import {
  KFZ_ANALYTICS_DERIVED_REVIEW_FIELDS,
  KFZ_ANALYTICS_FOUNDATION_MIGRATION,
  KFZ_ANALYTICS_PERSISTENCE_COLUMNS,
  KFZ_ANALYTICS_PERSISTENCE_CONTRACT_MIGRATION,
  KFZ_ANALYTICS_PERSISTENCE_TABLE,
  KFZ_ANALYTICS_PERSISTED_METADATA,
  KFZ_ANALYTICS_RLS_CONTRACT,
  KFZ_ANALYTICS_UNIQUE_EVENT_INDEX,
  kfzAnalyticsPropertiesPassPersistenceAllowlist,
} from '@/features/inbound/kfz/lib/kfz-analytics-persistence-contract'
import {
  KFZ_ANALYTICS_EVENT_NAMES,
  KFZ_ANALYTICS_PROPERTY_KEYS,
} from '@/features/inbound/kfz/types/kfz-analytics'

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')

function readMigration(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

function combinedAnalyticsSql(): string {
  return [
    readMigration(KFZ_ANALYTICS_FOUNDATION_MIGRATION),
    readMigration(KFZ_ANALYTICS_PERSISTENCE_CONTRACT_MIGRATION),
  ].join('\n')
}

describe('kfz analytics persistence schema contract', () => {
  it('extends the existing events table instead of creating a parallel store', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql'))
    assert.ok(files.includes('20260909140000_kfz_funnel_analytics_events.sql'))
    assert.ok(files.includes('20260911120000_kfz_funnel_analytics_persistence_contract.sql'))

    const foundation = readMigration(KFZ_ANALYTICS_FOUNDATION_MIGRATION)
    const contract = readMigration(KFZ_ANALYTICS_PERSISTENCE_CONTRACT_MIGRATION)

    assert.match(foundation, /create table if not exists public\.kfz_funnel_analytics_events/)
    assert.match(contract, /Additive persistence contract/)
    assert.match(contract, /already-created/)
    assert.doesNotMatch(contract, /create table public\.kfz_funnel_analytics_events/)
    assert.doesNotMatch(contract, /\bdrop table\b/i)
    assert.doesNotMatch(contract, /\bdrop column\b/i)
    assert.match(contract, /if not exists/i)
    assert.match(contract, /create or replace function public\.kfz_funnel_analytics_properties_are_allowed/)

    for (const column of KFZ_ANALYTICS_PERSISTENCE_COLUMNS) {
      assert.match(foundation, new RegExp(`\\b${column}\\b`))
    }
    for (const derived of KFZ_ANALYTICS_DERIVED_REVIEW_FIELDS) {
      assert.equal(
        (KFZ_ANALYTICS_PERSISTENCE_COLUMNS as readonly string[]).includes(derived),
        false,
        `derived field ${derived} must not be a stored column`,
      )
    }
  })

  it('accepts approved aggregate metadata for source, visit, branch, steps, timing and submit', () => {
    const sql = combinedAnalyticsSql()

    for (const eventName of KFZ_ANALYTICS_EVENT_NAMES) {
      assert.match(sql, new RegExp(`'${eventName}'`))
    }
    for (const key of KFZ_ANALYTICS_PROPERTY_KEYS) {
      assert.match(sql, new RegExp(`'${key}'`))
    }
    for (const branchId of KFZ_ANALYTICS_BRANCH_IDS) {
      assert.match(sql, new RegExp(`'${branchId}'`))
    }
    for (const stepId of KFZ_ANALYTICS_STEP_IDS) {
      assert.match(sql, new RegExp(`'${stepId}'`))
    }
    for (const token of KFZ_ANALYTICS_PERSISTED_METADATA) {
      assert.match(sql, new RegExp(token))
    }
    assert.match(sql, /Consent is a write gate/)
    assert.match(sql, /Data-quality counters are derived/)
    assert.match(sql, /kfz_funnel_analytics_events_properties_allowlisted/)
    assert.match(sql, /kfz_funnel_analytics_events_event_key_shape/)
    assert.match(sql, new RegExp(KFZ_ANALYTICS_UNIQUE_EVENT_INDEX))
  })

  it('rejects forbidden property keys and personal values at the SQL allow-list', () => {
    const sql = readMigration(KFZ_ANALYTICS_PERSISTENCE_CONTRACT_MIGRATION)
    assert.match(sql, /Rejects names, contacts, answers, filenames/)
    assert.match(sql, /https\?:\/\//)
    assert.match(sql, /properties - array\[/)
    assert.doesNotMatch(sql, /'fullName'/)
    assert.doesNotMatch(sql, /'objectKey'/)
    assert.doesNotMatch(sql, /'filename'/)
    assert.doesNotMatch(sql, /'answers'/)

    assert.equal(
      kfzAnalyticsPropertiesPassPersistenceAllowlist({
        stepId: 'contact',
        fromStepId: 'branch',
        branchId: 'switch_car',
        trafficSource: 'utm',
        referrerCategory: 'search',
        utmSource: 'google',
        utmCampaign: 'kfz-check',
        fieldId: 'missing_contact',
        errorCategory: 'timeout',
        activeMs: 2400,
        lastStepId: 'contact',
      }),
      true,
    )
    assert.equal(
      kfzAnalyticsPropertiesPassPersistenceAllowlist({
        stepId: 'documents',
        fullName: 'Max Mustermann',
        email: 'max@example.com',
      }),
      false,
    )
    assert.equal(
      kfzAnalyticsPropertiesPassPersistenceAllowlist({
        url: 'https://kfz.artkus.de/kfz?email=max@example.com',
      }),
      false,
    )
    assert.equal(
      kfzAnalyticsPropertiesPassPersistenceAllowlist({
        stepId: 'https://evil.example/?q=1',
      }),
      false,
    )

    for (const fieldId of KFZ_ANALYTICS_FIELD_IDS) {
      assert.match(sql, new RegExp(`'${fieldId}'`))
    }
    for (const source of KFZ_ANALYTICS_ALLOWED_UTM_SOURCES) {
      assert.match(sql, new RegExp(`'${source}'`))
    }
    for (const campaign of KFZ_ANALYTICS_ALLOWED_UTM_CAMPAIGNS) {
      assert.match(sql, new RegExp(`'${campaign}'`))
    }
  })
})

describe('kfz analytics persistence RLS contract', () => {
  it('keeps anonymous writes on the service-role allow-list and blocks public reads', () => {
    const sql = combinedAnalyticsSql()

    assert.equal(KFZ_ANALYTICS_RLS_CONTRACT.publicRead, false)
    assert.equal(KFZ_ANALYTICS_RLS_CONTRACT.anonRead, false)
    assert.equal(KFZ_ANALYTICS_RLS_CONTRACT.anonInsert, false)
    assert.equal(KFZ_ANALYTICS_RLS_CONTRACT.authenticatedInsert, false)
    assert.equal(KFZ_ANALYTICS_RLS_CONTRACT.anonymousEventWrite, 'service_role_after_allowlist')
    assert.equal(
      KFZ_ANALYTICS_RLS_CONTRACT.authorizedReview,
      'server_side_authenticated_select',
    )

    assert.match(sql, /enable row level security/)
    assert.match(sql, /force row level security/)
    assert.match(sql, /revoke all on table public\.kfz_funnel_analytics_events from public/)
    assert.match(sql, /revoke all on table public\.kfz_funnel_analytics_events from anon/)
    assert.match(sql, /revoke insert, update, delete, truncate/)
    assert.match(sql, /to authenticated/)
    assert.match(sql, /for select/)
    assert.match(sql, /user_has_active_agency_membership/)
    assert.match(sql, /grant all on table public\.kfz_funnel_analytics_events to service_role/)
    assert.match(sql, /drop policy if exists kfz_funnel_analytics_events_insert_anon/)
    assert.doesNotMatch(sql, /for insert\s+to anon/)
    assert.doesNotMatch(sql, /for select\s+to anon/)
    assert.doesNotMatch(sql, /for insert\s+to authenticated/)
    assert.doesNotMatch(sql, /grant insert on table public\.kfz_funnel_analytics_events to anon/)
    assert.doesNotMatch(sql, /grant select on table public\.kfz_funnel_analytics_events to anon/)
    assert.match(sql, new RegExp(KFZ_ANALYTICS_PERSISTENCE_TABLE))
  })
})
