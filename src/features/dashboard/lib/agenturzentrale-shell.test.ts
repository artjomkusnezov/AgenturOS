import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import {
  AGENTURZENTRALE_SHELL_ATMOSPHERE_CLASS,
  AGENTURZENTRALE_SHELL_CLASS,
  AGENTURZENTRALE_SHELL_CONTENT_CLASS,
  AGENTURZENTRALE_SHELL_FRAME_CLASS,
  AGENTURZENTRALE_SHELL_LABEL,
  DASHBOARD_SURFACE_CLASS,
} from '@/features/dashboard/lib/agenturzentrale-shell'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

describe('Agenturzentrale shell (38B first slice)', () => {
  it('exports stable shell markers for the dark command-center frame', () => {
    assert.equal(AGENTURZENTRALE_SHELL_CLASS, 'agenturzentrale-shell')
    assert.equal(AGENTURZENTRALE_SHELL_ATMOSPHERE_CLASS, 'agenturzentrale-shell__atmosphere')
    assert.equal(AGENTURZENTRALE_SHELL_FRAME_CLASS, 'agenturzentrale-shell__frame')
    assert.equal(AGENTURZENTRALE_SHELL_CONTENT_CLASS, 'agenturzentrale-shell__content')
    assert.equal(AGENTURZENTRALE_SHELL_LABEL, 'Agenturzentrale')
    assert.equal(DASHBOARD_SURFACE_CLASS, 'dashboard-surface')
  })

  it('wires the shell on /app without new provider or client-boundary architecture', () => {
    const page = readRepoFile('src/app/app/page.tsx')
    const shell = readRepoFile('src/features/dashboard/components/agenturzentrale-shell.tsx')

    assert.match(page, /AgenturzentraleShell/)
    assert.match(page, /DashboardPageContent/)
    assert.match(page, /WorkspaceFrame/)
    assert.doesNotMatch(page, /createContext|useContext|Provider/)
    assert.doesNotMatch(shell, /['"]use client['"]/)
    assert.doesNotMatch(shell, /createContext|useContext|Provider/)
  })

  it('keeps dashboard data path and auth fetching on the existing server content module', () => {
    const content = readRepoFile('src/features/dashboard/components/dashboard-page-content.tsx')
    const overview = readRepoFile('src/features/dashboard/components/dashboard-work-overview.tsx')

    assert.match(content, /listInboxItemsForCurrentUser/)
    assert.match(content, /DashboardWorkOverview/)
    assert.match(overview, /DashboardInboxSection/)
    assert.match(overview, /DashboardAttentionSection/)
    assert.doesNotMatch(content, /createContext|useContext|Provider/)
    assert.doesNotMatch(overview, /createContext|useContext|Provider/)
  })

  it('scopes shell atmosphere styles and imports them for the app', () => {
    const css = readRepoFile('src/styles/agenturzentrale-shell.css')
    const globals = readRepoFile('src/app/globals.css')
    const surface = readRepoFile('src/features/dashboard/lib/dashboard-surface.ts')

    assert.match(css, /\.agenturzentrale-shell\b/)
    assert.match(css, /--az-shell-bg/)
    assert.match(css, /\.dashboard-greeting__title/)
    assert.match(globals, /agenturzentrale-shell\.css/)
    assert.match(surface, /dashboard-surface/)
  })
})
