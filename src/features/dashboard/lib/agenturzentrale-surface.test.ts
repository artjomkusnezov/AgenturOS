import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveSurfaceClasses } from '@/features/dashboard/lib/agenturzentrale-surface'

describe('resolveSurfaceClasses', () => {
  it('returns dark command-center classes for agenturzentrale variant', () => {
    const surfaces = resolveSurfaceClasses('agenturzentrale')
    assert.match(surfaces.surface, /az-panel/)
    assert.match(surfaces.sectionHeader, /var\(--az-text-primary\)/)
    assert.match(surfaces.link, /var\(--az-accent-blue\)/)
  })

  it('returns default light dashboard classes for default variant', () => {
    const surfaces = resolveSurfaceClasses('default')
    assert.match(surfaces.surface, /bg-white/)
    assert.match(surfaces.sectionHeader, /text-zinc-900/)
  })
})
