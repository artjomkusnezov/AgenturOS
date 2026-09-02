import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import { resolveSurfaceClasses } from '@/features/dashboard/lib/agenturzentrale-surface'
import {
  formatDashboardDateOrTime,
  splitInboxFeedContent,
} from '@/features/dashboard/lib/dashboard-format'
import type { DashboardVariant } from '@/features/dashboard/lib/dashboard-variant'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'

function readSrc(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), 'src', relativePath), 'utf8')
}

/** JSX construction (return/assign/grouped), not TypeScript generics such as Record<string, unknown>. */
function containsJsxConstruction(source: string): boolean {
  return /(?:return|=|\()\s*<\/?[A-Za-z]/.test(source)
}

describe('dashboard variant boundary', () => {
  it('keeps DashboardVariant importable from a non-client module', () => {
    const variants: DashboardVariant[] = ['default', 'agenturzentrale']
    assert.deepEqual(variants, ['default', 'agenturzentrale'])
  })

  it('resolves agenturzentrale surfaces without needing the client context module', () => {
    const surfaces = resolveSurfaceClasses('agenturzentrale')
    assert.match(surfaces.surface, /az-panel/)
    assert.match(surfaces.titleText, /az-text-primary/)
  })

  it('keeps the live Agenturzentrale path free of DashboardVariantProvider', () => {
    const overview = readSrc('features/dashboard/components/dashboard-work-overview.tsx')
    const pageContent = readSrc('features/dashboard/components/dashboard-page-content.tsx')

    assert.doesNotMatch(overview, /DashboardVariantProvider/)
    assert.doesNotMatch(overview, /useDashboardVariant/)
    assert.doesNotMatch(pageContent, /DashboardVariantProvider/)
    assert.doesNotMatch(pageContent, /useDashboardVariant/)
    assert.match(overview, /variant=\{AGENTURZENTRALE_VARIANT\}/)
  })

  it('keeps live operational sections as Server Components (no use client)', () => {
    const files = [
      'features/dashboard/components/dashboard-work-overview.tsx',
      'features/dashboard/components/agenturzentrale-command-rail.tsx',
      'features/dashboard/components/dashboard-inbox-section.tsx',
      'features/dashboard/components/dashboard-attention-section.tsx',
      'features/dashboard/components/dashboard-my-work-section.tsx',
      'features/dashboard/components/dashboard-my-tasks-section.tsx',
      'features/dashboard/components/dashboard-section.tsx',
      'features/dashboard/components/dashboard-task-row.tsx',
      'features/dashboard/components/dashboard-page-content.tsx',
    ]

    for (const file of files) {
      const source = readSrc(file)
      assert.doesNotMatch(
        source,
        /^['"]use client['"]/m,
        `${file} must remain a Server Component`,
      )
      assert.doesNotMatch(source, /useDashboardVariant/)
    }
  })

  it('distinguishes JSX construction from TypeScript generics in boundary checks', () => {
    assert.equal(containsJsxConstruction('user_metadata as Record<string, unknown>'), false)
    assert.equal(containsJsxConstruction('const items: Array<string> = []'), false)
    assert.equal(containsJsxConstruction('return <DashboardErrorBanner message={msg} />'), true)
    assert.equal(containsJsxConstruction('loadResult = (<DashboardWorkOverview {...props} />)'), true)
  })

  it('keeps dashboard page content JSX outside try/catch', () => {
    const source = readSrc('features/dashboard/components/dashboard-page-content.tsx')
    const tryBlock = source.match(/try\s*\{[\s\S]*?\}\s*catch/)
    assert.ok(tryBlock, 'expected a try/catch around data loading')
    assert.equal(
      containsJsxConstruction(tryBlock[0]),
      false,
      'JSX must not be constructed inside try/catch',
    )
    assert.match(source, /return <DashboardErrorBanner/)
    assert.match(source, /return <DashboardWorkOverview/)
  })
})

describe('command rail count safety', () => {
  it('sanitizes non-finite team counts used by the status rail', () => {
    assert.equal(sanitizeDashboardCount(Number.NaN), 0)
    assert.equal(sanitizeDashboardCount(-3), 0)
    assert.equal(sanitizeDashboardCount(4.9), 4)
  })
})

describe('dashboard format hardening', () => {
  it('tolerates malformed dates without throwing', () => {
    assert.equal(formatDashboardDateOrTime(null), '—')
    assert.equal(formatDashboardDateOrTime(undefined), '—')
    assert.equal(formatDashboardDateOrTime(''), '—')
    assert.equal(formatDashboardDateOrTime('not-a-date'), '—')
  })

  it('tolerates empty or non-string inbox content', () => {
    assert.deepEqual(splitInboxFeedContent(null), { title: 'Ohne Inhalt', preview: null })
    assert.deepEqual(splitInboxFeedContent(undefined), { title: 'Ohne Inhalt', preview: null })
    assert.deepEqual(splitInboxFeedContent(''), { title: 'Ohne Inhalt', preview: null })
    assert.equal(splitInboxFeedContent('Kurzer Text').title, 'Kurzer Text')
  })
})
