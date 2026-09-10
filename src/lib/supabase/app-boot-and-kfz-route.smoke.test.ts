/**
 * /app boot must not crash with the opaque Supabase client error.
 * /kfz stays in the production build and independent of a dashboard session.
 * /dev/kfz-landing remains development/test-only.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { KFZ_LANDING_BRANCHES } from '@/features/inbound/kfz/lib/kfz-questionnaire'
import { OPAQUE_SUPABASE_CLIENT_BOOT_ERROR } from '@/lib/supabase/public-config'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..', '..')

function readRepo(relative: string): string {
  return fs.readFileSync(path.join(repoRoot, relative), 'utf8')
}

const REQUIRED_KFZ_BRANCH_IDS = [
  'upload_documents',
  'no_documents',
  'first_car',
  'additional_car',
  'switch_car',
  'evb',
] as const

describe('app boot configuration contract', () => {
  it('centralizes public config and stops non-null env assertions', () => {
    const publicConfig = readRepo('src/lib/supabase/public-config.ts')
    const client = readRepo('src/lib/supabase/client.ts')
    const server = readRepo('src/lib/supabase/server.ts')
    const proxy = readRepo('src/lib/supabase/proxy.ts')
    const appLayout = readRepo('src/app/app/layout.tsx')
    const errorSurface = readRepo('src/components/supabase-configuration-error.tsx')

    assert.match(publicConfig, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)
    assert.match(publicConfig, /NEXT_PUBLIC_SUPABASE_ANON_KEY/)
    assert.doesNotMatch(publicConfig, /SERVICE_ROLE/)
    assert.match(publicConfig, /SUPABASE_PUBLIC_CONFIG_MISSING_ERROR/)

    assert.match(client, /requirePublicSupabaseConfig/)
    assert.match(server, /requirePublicSupabaseConfig/)
    assert.match(proxy, /readPublicSupabaseConfig/)
    assert.doesNotMatch(client, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!/)
    assert.doesNotMatch(server, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!/)
    assert.doesNotMatch(proxy, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!/)
    assert.doesNotMatch(client, /NEXT_PUBLIC_SUPABASE_URL!/)
    assert.doesNotMatch(server, /NEXT_PUBLIC_SUPABASE_URL!/)
    assert.doesNotMatch(proxy, /NEXT_PUBLIC_SUPABASE_URL!/)

    assert.match(appLayout, /getPublicSupabaseBootState/)
    assert.match(appLayout, /SupabaseConfigurationError/)
    assert.match(errorSurface, /SUPABASE_PUBLIC_CONFIG_MISSING_ERROR/)
    assert.match(errorSurface, /href="\/kfz"/)
    assert.doesNotMatch(errorSurface, /URL and Key are required/)
    assert.doesNotMatch(appLayout, new RegExp(OPAQUE_SUPABASE_CLIENT_BOOT_ERROR))
    assert.doesNotMatch(errorSurface, /eyJ|Bearer /)
  })

  it('keeps the proxy from constructing a Supabase client without public config', () => {
    const proxy = readRepo('src/lib/supabase/proxy.ts')
    assert.match(proxy, /if \(!config\.ok\)/)
    assert.match(proxy, /return supabaseResponse/)
    assert.doesNotMatch(proxy, /SERVICE_ROLE/)
  })
})

describe('public kfz route presence', () => {
  it('keeps /kfz in the production app router without a dashboard session', () => {
    const page = readRepo('src/app/kfz/page.tsx')
    const preview = readRepo('src/app/dev/kfz-landing/page.tsx')
    const nextConfig = readRepo('next.config.ts')

    assert.equal(fs.existsSync(path.join(repoRoot, 'src/app/kfz/page.tsx')), true)
    assert.match(page, /KfzLandingWithAnalytics/)
    assert.match(page, /KfzLandingShell/)
    assert.doesNotMatch(page, /notFound\(/)
    assert.doesNotMatch(page, /NODE_ENV === 'production'/)
    assert.doesNotMatch(page, /createClient/)
    assert.doesNotMatch(page, /redirect\('\/login'\)/)
    assert.doesNotMatch(page, /redirect\("\/login"\)/)
    assert.doesNotMatch(page, /getUser\(/)
    assert.doesNotMatch(nextConfig, /exclude.*kfz|kfz.*exclude/)

    assert.match(preview, /NODE_ENV === 'production'/)
    assert.match(preview, /notFound\(/)
    assert.match(preview, /KfzLandingPreviewApp/)
  })

  it('preserves all six Kfz branches, consent and private document storage', () => {
    assert.equal(KFZ_LANDING_BRANCHES.length, 6)
    assert.deepEqual(
      KFZ_LANDING_BRANCHES.map((branch) => branch.id),
      [...REQUIRED_KFZ_BRANCH_IDS],
    )

    const questionnaire = readRepo('src/features/inbound/kfz/lib/kfz-questionnaire.ts')
    const consent = readRepo('src/features/inbound/kfz/lib/kfz-landing-steps.ts')
    const documents = readRepo('src/features/inbound/kfz/lib/kfz-document-storage.ts')
    const form = readRepo('src/features/inbound/kfz/components/kfz-landing-form.tsx')

    assert.match(questionnaire, /upload_documents/)
    assert.match(consent, /validateKfzLandingConsent/)
    assert.match(documents, /fail closed/)
    assert.match(form, /KFZ_LANDING_PRIVACY_URL/)
    assert.doesNotMatch(form, /getPublicUrl/)
  })
})
