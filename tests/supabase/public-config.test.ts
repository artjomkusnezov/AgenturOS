/**
 * Reproduce Preview boot combinations without printing URL or key values.
 * missing → safe error; legacy anon → accepted; current publishable → preferred.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createServerClient } from '@supabase/ssr'

import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  getPublicSupabaseBootState,
  NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME,
  NEXT_PUBLIC_SUPABASE_URL_NAME,
  OPAQUE_SUPABASE_CLIENT_BOOT_ERROR,
  readPublicSupabaseConfig,
  requirePublicSupabaseConfig,
  shouldRefreshPublicSupabaseSession,
  SUPABASE_PUBLIC_CONFIG_MISSING_ERROR,
  SupabasePublicConfigError,
} from '@/lib/supabase/public-config'

const FIXTURE_URL = 'https://preview-boot-fixture.example.supabase.co'
const FIXTURE_PUBLISHABLE = 'publishable-do-not-print-preview-boot'
const FIXTURE_ANON = 'anon-do-not-print-preview-boot'
const FIXTURE_SERVICE_ROLE = 'service-role-do-not-print-preview-boot'

const EMPTY_COOKIES = {
  getAll() {
    return []
  },
  setAll() {
    return undefined
  },
}

function assertNoFixtureValues(value: unknown) {
  const serialized = JSON.stringify(value)
  assert.doesNotMatch(serialized, /preview-boot-fixture/)
  assert.doesNotMatch(serialized, /publishable-do-not-print/)
  assert.doesNotMatch(serialized, /anon-do-not-print/)
  assert.doesNotMatch(serialized, /service-role-do-not-print/)
  assert.doesNotMatch(serialized, /eyJ/)
}

describe('public supabase preview boot combinations', () => {
  it('reproduces the opaque @supabase/ssr Preview 500 when url/key are omitted', () => {
    assert.throws(
      () =>
        createServerClient('', '', {
          cookies: EMPTY_COOKIES,
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, new RegExp(OPAQUE_SUPABASE_CLIENT_BOOT_ERROR))
        return true
      },
    )
  })

  it('fails closed for missing public names without printing values', () => {
    const missing = readPublicSupabaseConfig({})
    assert.equal(missing.ok, false)
    if (missing.ok) {
      return
    }
    assert.equal(missing.error, SUPABASE_PUBLIC_CONFIG_MISSING_ERROR)
    assert.deepEqual(missing.missingNames, [
      NEXT_PUBLIC_SUPABASE_URL_NAME,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME,
    ])
    assert.equal(shouldRefreshPublicSupabaseSession({}), false)
    assert.equal(getPublicSupabaseBootState({}).ready, false)
    assertNoFixtureValues(missing)
    assert.doesNotMatch(missing.error, /URL and Key are required/)

    assert.throws(
      () => requirePublicSupabaseConfig({}),
      (error: unknown) => {
        assert.ok(error instanceof SupabasePublicConfigError)
        assert.equal(error.message, SUPABASE_PUBLIC_CONFIG_MISSING_ERROR)
        assert.doesNotMatch(error.message, /URL and Key are required/)
        assertNoFixtureValues({ message: error.message, names: error.missingNames })
        return true
      },
    )
  })

  it('does not accept a service-role-only process as public boot config', () => {
    const onlyPersist = readPublicSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: FIXTURE_URL,
      SUPABASE_SERVICE_ROLE_KEY: FIXTURE_SERVICE_ROLE,
    })
    assert.equal(onlyPersist.ok, false)
    if (onlyPersist.ok) {
      return
    }
    assert.deepEqual(onlyPersist.missingNames, [NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME])
    assertNoFixtureValues({
      error: onlyPersist.error,
      missingNames: onlyPersist.missingNames,
    })
  })

  it('accepts the current publishable key name', () => {
    const current = readPublicSupabaseConfig({
      [NEXT_PUBLIC_SUPABASE_URL_NAME]: FIXTURE_URL,
      [NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME]: FIXTURE_PUBLISHABLE,
    })
    assert.equal(current.ok, true)
    if (!current.ok) {
      return
    }
    assert.equal(current.keyName, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME)
    assert.equal(current.url, FIXTURE_URL)
    assert.equal(current.key, FIXTURE_PUBLISHABLE)
    assert.equal(
      shouldRefreshPublicSupabaseSession({
        [NEXT_PUBLIC_SUPABASE_URL_NAME]: FIXTURE_URL,
        [NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME]: FIXTURE_PUBLISHABLE,
      }),
      true,
    )
    assert.equal(
      getPublicSupabaseBootState({
        [NEXT_PUBLIC_SUPABASE_URL_NAME]: FIXTURE_URL,
        [NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME]: FIXTURE_PUBLISHABLE,
      }).ready,
      true,
    )
  })

  it('accepts the legacy anon key name already used by deployments', () => {
    const legacy = readPublicSupabaseConfig({
      [NEXT_PUBLIC_SUPABASE_URL_NAME]: FIXTURE_URL,
      [NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME]: FIXTURE_ANON,
    })
    assert.equal(legacy.ok, true)
    if (!legacy.ok) {
      return
    }
    assert.equal(legacy.keyName, NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME)
    assert.equal(legacy.key, FIXTURE_ANON)
  })

  it('prefers the current publishable name when both public keys are set', () => {
    const both = readPublicSupabaseConfig({
      [NEXT_PUBLIC_SUPABASE_URL_NAME]: FIXTURE_URL,
      [NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME]: FIXTURE_PUBLISHABLE,
      [NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME]: FIXTURE_ANON,
    })
    assert.equal(both.ok, true)
    if (!both.ok) {
      return
    }
    assert.equal(both.keyName, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME)
    assert.equal(both.key, FIXTURE_PUBLISHABLE)
  })

  it('treats whitespace-only and non-URL placeholders as missing', () => {
    const invalid = readPublicSupabaseConfig({
      [NEXT_PUBLIC_SUPABASE_URL_NAME]: 'your-project-url',
      [NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME]: '   ',
    })
    assert.equal(invalid.ok, false)
    if (invalid.ok) {
      return
    }
    assert.deepEqual(invalid.missingNames, [
      NEXT_PUBLIC_SUPABASE_URL_NAME,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME,
    ])
    assertNoFixtureValues(invalid)
  })

  it('throws the safe boot error from the browser client before @supabase/ssr', () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const prevPublishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const prevAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    try {
      assert.throws(
        () => createBrowserSupabaseClient(),
        (error: unknown) => {
          assert.ok(error instanceof SupabasePublicConfigError)
          assert.equal(error.message, SUPABASE_PUBLIC_CONFIG_MISSING_ERROR)
          assert.doesNotMatch(error.message, /URL and Key are required/)
          return true
        },
      )
    } finally {
      if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl
      if (prevPublishable === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = prevPublishable
      }
      if (prevAnon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevAnon
    }
  })
})
