import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveSurfaceClasses } from '@/features/dashboard/lib/agenturzentrale-surface'
import type { DashboardVariant } from '@/features/dashboard/lib/dashboard-variant'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'

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
})

describe('command rail count safety', () => {
  it('sanitizes non-finite team counts used by the status rail', () => {
    assert.equal(sanitizeDashboardCount(Number.NaN), 0)
    assert.equal(sanitizeDashboardCount(-3), 0)
    assert.equal(sanitizeDashboardCount(4.9), 4)
  })
})
