/**
 * Database-contract regression for private Kfz document storage.
 * Does not connect to or mutate any database.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { KFZ_INBOUND_DOCUMENTS_BUCKET } from '@/features/inbound/kfz/types/kfz-document-storage'
import { KFZ_LANDING_MAX_DOCUMENT_BYTES } from '@/features/inbound/kfz/lib/kfz-landing-documents'

const MIGRATION = join(
  process.cwd(),
  'supabase/migrations/20260910120000_kfz_inbound_documents_bucket.sql',
)

describe('kfz inbound documents bucket contract', () => {
  it('checks in a private bucket with no public or client policies', () => {
    const sql = readFileSync(MIGRATION, 'utf8')
    assert.match(sql, new RegExp(`'${KFZ_INBOUND_DOCUMENTS_BUCKET}'`))
    assert.match(sql, /file_size_limit/)
    assert.match(sql, /\bfalse\b/)
    assert.match(sql, new RegExp(String(KFZ_LANDING_MAX_DOCUMENT_BYTES)))
    assert.doesNotMatch(sql, /public\s*=\s*true/)
    assert.doesNotMatch(sql, /to anon/)
    assert.doesNotMatch(sql, /to authenticated/)
    assert.doesNotMatch(sql, /getPublicUrl|signedUrl/i)
    assert.match(sql, /service_role/)
    assert.match(sql, /Least privilege/i)
    assert.match(sql, /on conflict \(id\) do update/)
    assert.match(sql, /public = false/)
  })
})
