/**
 * Database-contract regression for Kfz website intake.
 *
 * Asserts that the checked-in Supabase migration history allows the persisted
 * Kfz intake shape (channel='website', source='website') on inbox_items.
 * Memory-store coverage alone is insufficient for production inserts.
 *
 * Does not connect to or mutate any database.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { INBOX_SOURCE_WEBSITE } from '@/features/inbound/lib/inbound-item-utils'
import { INBOUND_CHANNELS } from '@/features/inbound/types/inbound-item'

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')

/** Persisted Kfz intake shape — must stay compatible with DB CHECKs. */
const KFZ_PERSISTED_CHANNEL = 'website' as const
const KFZ_PERSISTED_SOURCE = INBOX_SOURCE_WEBSITE

const BASELINE_CHANNELS = ['manual', 'whatsapp', 'email'] as const
const BASELINE_SOURCES = [
  'manual_text',
  'universal_capture',
  'whatsapp',
  'email',
] as const

function listMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
}

function extractInList(sql: string, constraintName: string): string[] | null {
  const pattern = new RegExp(
    String.raw`add\s+constraint\s+${constraintName}\s+check\s*\(\s*[a-z_]+\s+in\s*\(([^)]*)\)`,
    'is',
  )
  const match = sql.match(pattern)
  if (!match) {
    return null
  }

  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

function resolveEffectiveAllowedValues(constraintName: string): {
  values: string[]
  migrationFile: string | null
} {
  let values: string[] = []
  let migrationFile: string | null = null

  for (const file of listMigrationFiles()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    const extracted = extractInList(sql, constraintName)
    if (extracted) {
      values = extracted
      migrationFile = file
    }
  }

  return { values, migrationFile }
}

describe('inbox_items website database contract', () => {
  it('Kfz persisted channel/source constants match website intake shape', () => {
    assert.equal(KFZ_PERSISTED_CHANNEL, 'website')
    assert.equal(KFZ_PERSISTED_SOURCE, 'website')
    assert.ok(
      (INBOUND_CHANNELS as readonly string[]).includes(KFZ_PERSISTED_CHANNEL),
      'INBOUND_CHANNELS must include website',
    )
  })

  it('checked-in migrations accept channel=website without dropping prior values', () => {
    const { values, migrationFile } = resolveEffectiveAllowedValues(
      'inbox_items_channel_valid',
    )

    assert.ok(
      migrationFile,
      'expected at least one migration defining inbox_items_channel_valid',
    )
    assert.ok(
      values.includes(KFZ_PERSISTED_CHANNEL),
      `effective channel CHECK from ${migrationFile} must allow '${KFZ_PERSISTED_CHANNEL}'; got [${values.join(', ')}]`,
    )

    for (const channel of BASELINE_CHANNELS) {
      assert.ok(
        values.includes(channel),
        `effective channel CHECK must preserve '${channel}' (found in ${migrationFile})`,
      )
    }
  })

  it('checked-in migrations accept source=website without dropping prior values', () => {
    const { values, migrationFile } = resolveEffectiveAllowedValues(
      'inbox_items_source_valid',
    )

    assert.ok(
      migrationFile,
      'expected at least one migration defining inbox_items_source_valid',
    )
    assert.ok(
      values.includes(KFZ_PERSISTED_SOURCE),
      `effective source CHECK from ${migrationFile} must allow '${KFZ_PERSISTED_SOURCE}'; got [${values.join(', ')}]`,
    )

    for (const source of BASELINE_SOURCES) {
      assert.ok(
        values.includes(source),
        `effective source CHECK must preserve '${source}' (found in ${migrationFile})`,
      )
    }
  })

  it('additive website migration is present and named for inbox website channel/source', () => {
    const files = listMigrationFiles()
    const websiteMigration = files.find((name) =>
      name.includes('inbox_website_channel_source'),
    )

    assert.ok(
      websiteMigration,
      'expected supabase/migrations/*_inbox_website_channel_source.sql',
    )

    const sql = readFileSync(join(MIGRATIONS_DIR, websiteMigration!), 'utf8')
    assert.match(sql, /inbox_items_channel_valid/i)
    assert.match(sql, /inbox_items_source_valid/i)
    assert.match(sql, /'website'/)
    assert.doesNotMatch(sql, /\bdrop\s+column\b/i)
  })
})
