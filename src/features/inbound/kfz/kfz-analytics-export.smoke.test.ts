/**
 * Privacy-safe Kfz campaign decision export.
 * Authorized aggregate CSV only — no sessions, answers or personal data.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { aggregateKfzAnalyticsDashboard } from '@/features/inbound/kfz/lib/kfz-analytics-aggregate'
import {
  buildKfzAnalyticsDecisionExport,
  exportKfzAnalyticsDecisionFromLoad,
  KFZ_ANALYTICS_DECISION_EXPORT_CONTENT_TYPE,
  KFZ_ANALYTICS_DECISION_EXPORT_HEADERS,
  kfzAnalyticsDecisionExportHasForbiddenField,
  neutralizeKfzAnalyticsCsvCell,
  sanitizeKfzAnalyticsExportText,
  unauthorizedKfzAnalyticsDecisionExport,
  visibleKfzAnalyticsDecisionMetrics,
} from '@/features/inbound/kfz/lib/kfz-analytics-export'
import { KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS } from '@/features/inbound/kfz/lib/kfz-analytics-fixtures'
import {
  KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR,
  KFZ_ANALYTICS_UNAVAILABLE_ERROR,
} from '@/features/inbound/kfz/lib/kfz-analytics-review-state'
import type {
  KfzAnalyticsComparisonRow,
  KfzAnalyticsDashboard,
} from '@/features/inbound/kfz/types/kfz-analytics'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const nowMs = Date.parse('2026-09-09T12:00:00.000Z')

function parseExportCsv(csv: string): string[][] {
  const body = csv.replace(/^\uFEFF/, '').replace(/\r\n$/, '')
  return body.split('\r\n').map((line) => {
    const cells: string[] = []
    const matcher = /"((?:[^"]|"")*)"/g
    let match = matcher.exec(line)
    while (match) {
      cells.push(match[1]!.replaceAll('""', '"'))
      match = matcher.exec(line)
    }
    return cells
  })
}

function dashboardFor(
  periodId: '7d' | '30d' | '90d' | 'all',
  query?: { source?: string; branch?: string },
): KfzAnalyticsDashboard {
  return aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS, {
    periodId,
    nowMs,
    query,
  })
}

function rowByGroup(rows: string[][], labelPart: string): string[] | undefined {
  return rows.find((row) => row[3]?.includes(labelPart))
}

describe('kfz analytics decision export authorization', () => {
  it('refuses unauthorized and unconfigured review without a CSV', () => {
    const unauthorized = exportKfzAnalyticsDecisionFromLoad({
      ok: false,
      status: 'unavailable',
      error: KFZ_ANALYTICS_UNAVAILABLE_ERROR,
    })
    assert.equal(unauthorized.ok, false)
    if (unauthorized.ok) {
      throw new Error('expected denial')
    }
    assert.equal(unauthorized.status, 'unavailable')
    assert.equal(unauthorized.error, KFZ_ANALYTICS_UNAVAILABLE_ERROR)
    assert.equal('csv' in unauthorized, false)
    assert.equal('filename' in unauthorized, false)

    const missing = exportKfzAnalyticsDecisionFromLoad({
      ok: false,
      status: 'configuration_missing',
      error: KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR,
    })
    assert.equal(missing.ok, false)
    if (missing.ok) {
      throw new Error('expected configuration denial')
    }
    assert.equal(missing.status, 'configuration_missing')
    assert.equal('csv' in missing, false)

    const helper = unauthorizedKfzAnalyticsDecisionExport()
    assert.equal(helper.ok, false)
    assert.equal(helper.status, 'unavailable')
  })

  it('reuses the authorized dashboard load and does not open a second store', () => {
    const action = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/actions/export-kfz-analytics-decision.ts'),
      'utf8',
    )
    const load = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/actions/load-kfz-analytics-dashboard.ts'),
      'utf8',
    )
    const app = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/components/kfz-analytics-dashboard-app.tsx'),
      'utf8',
    )
    assert.match(action, /loadKfzAnalyticsDashboardAction/)
    assert.match(action, /exportKfzAnalyticsDecisionFromLoad/)
    assert.doesNotMatch(action, /createServiceRoleKfzAnalyticsStore/)
    assert.doesNotMatch(action, /createMemoryKfzAnalyticsStore/)
    assert.doesNotMatch(action, /matchedSessionIds/)
    assert.match(load, /getCurrentUserAgency/)
    assert.match(load, /createAuthenticatedKfzAnalyticsStore/)
    assert.match(app, /exportMode="authorized"/)
  })
})

describe('kfz analytics decision export filters and periods', () => {
  it('exports only the selected 7/30/90-day source × branch rows', () => {
    const seven = buildKfzAnalyticsDecisionExport(dashboardFor('7d'))
    const thirty = buildKfzAnalyticsDecisionExport(dashboardFor('30d'))
    const ninety = buildKfzAnalyticsDecisionExport(dashboardFor('90d'))
    const sevenRows = parseExportCsv(seven.csv)
    const thirtyRows = parseExportCsv(thirty.csv)
    const ninetyRows = parseExportCsv(ninety.csv)

    assert.equal(seven.filename, 'kfz-herkunft-einstieg-7d.csv')
    assert.equal(thirty.filename, 'kfz-herkunft-einstieg-30d.csv')
    assert.equal(ninety.filename, 'kfz-herkunft-einstieg-90d.csv')
    assert.deepEqual(sevenRows[0], [...KFZ_ANALYTICS_DECISION_EXPORT_HEADERS])
    assert.equal(seven.contentType, KFZ_ANALYTICS_DECISION_EXPORT_CONTENT_TYPE)

    assert.ok(rowByGroup(sevenRows, 'Bezahlt'))
    assert.equal(rowByGroup(sevenRows, 'Organisch'), undefined)
    assert.equal(rowByGroup(sevenRows, 'Verweis'), undefined)
    assert.equal(rowByGroup(sevenRows, 'Direkt'), undefined)

    assert.ok(rowByGroup(thirtyRows, 'Organisch'))
    assert.equal(rowByGroup(thirtyRows, 'Verweis'), undefined)

    assert.ok(rowByGroup(ninetyRows, 'Verweis'))
    assert.equal(rowByGroup(ninetyRows, 'Direkt'), undefined)

    assert.ok(seven.rowCount < thirty.rowCount)
    assert.ok(thirty.rowCount < ninety.rowCount)
    assert.equal(sevenRows.every((row) => row[0] === 'zeitraum' || row[0] === '7d'), true)
  })

  it('keeps source and branch filters on the same aggregate', () => {
    const filtered = buildKfzAnalyticsDecisionExport(
      dashboardFor('7d', { branch: 'upload_documents' }),
    )
    const rows = parseExportCsv(filtered.csv)
    assert.equal(filtered.rowCount, 1)
    assert.ok(rowByGroup(rows, 'Bezahlt'))
    assert.equal(rowByGroup(rows, 'eVB'), undefined)
    assert.equal(rowByGroup(rows, 'Unbekannt'), undefined)
    assert.doesNotMatch(filtered.csv, /instagram|google\.de|Mustermann/i)
  })
})

describe('kfz analytics decision export suppression', () => {
  it('omits reached, stop, timing and conversion below the threshold', () => {
    const dashboard = dashboardFor('7d')
    const paidEvb = dashboard.sourceBranchComparisons.find((row) => row.id === 'paid:evb')
    assert.ok(paidEvb)
    const visible = visibleKfzAnalyticsDecisionMetrics({
      ...paidEvb,
      conversionRate: 1,
      topReachedStepLabel: 'Unterlagen',
      topDropOffStepLabel: 'Kontakt',
      medianActiveMs: 99_000,
      medianStepActiveMs: 12_000,
    })
    assert.equal(visible.ratesHidden, true)
    assert.equal(visible.visits, 1)
    assert.equal(visible.submissions, 1)
    assert.equal(visible.reachedLabel, null)
    assert.equal(visible.stopLabel, null)
    assert.equal(visible.medianSiteMs, null)
    assert.equal(visible.medianStepMs, null)
    assert.equal(visible.conversionRate, null)

    const file = buildKfzAnalyticsDecisionExport(dashboard)
    const evb = rowByGroup(parseExportCsv(file.csv), 'eVB')
    assert.ok(evb)
    assert.equal(evb[4], '1')
    assert.equal(evb[5], '')
    assert.equal(evb[6], '')
    assert.equal(evb[7], '')
    assert.equal(evb[8], '')
    assert.equal(evb[9], '1')
    assert.equal(evb[10], '')
    assert.doesNotMatch(evb.join(','), /100\.0|Unterlagen|Kontakt|99000/)
  })

  it('keeps aggregate values for groups that meet the threshold', () => {
    const dashboard = dashboardFor('7d')
    const paidUpload = dashboard.sourceBranchComparisons.find(
      (row) => row.id === 'paid:upload_documents',
    )
    assert.ok(paidUpload)
    const visible = visibleKfzAnalyticsDecisionMetrics(paidUpload)
    assert.equal(visible.ratesHidden, false)
    assert.equal(visible.visits, 5)
    assert.equal(visible.submissions, 5)
    assert.equal(visible.reachedLabel, 'Unterlagen')
    assert.equal(visible.conversionRate, 1)
    assert.equal(visible.medianSiteMs, 56_000)

    const exported = rowByGroup(parseExportCsv(buildKfzAnalyticsDecisionExport(dashboard).csv), 'Bezahlt')
    assert.ok(exported)
    assert.equal(exported[4], '5')
    assert.equal(exported[5], 'Unterlagen')
    assert.equal(exported[9], '5')
    assert.equal(exported[10], '100.0')
    assert.equal(exported[7], '56000')
  })
})

describe('kfz analytics decision export privacy and csv safety', () => {
  it('never writes forbidden identifiers, answers or secrets', () => {
    const dashboard = dashboardFor('90d')
    const file = buildKfzAnalyticsDecisionExport(dashboard)
    assert.deepEqual(kfzAnalyticsDecisionExportHasForbiddenField(file.csv), [])
    assert.doesNotMatch(file.csv, /Mustermann|max@example.com|\+49170|OS-AB|schein\.pdf|Golf/i)
    assert.doesNotMatch(file.csv, /sf_class|Selbstbeteiligung|1\.000 €/)
    assert.doesNotMatch(file.csv, /user-agent|https?:\/\/|filename|objectKey|freeText|queryString/i)
    assert.doesNotMatch(file.csv, /sessionId|aaaaaaaa-aaaa|matchedSessionIds|eventKey/)
    assert.equal(file.csv.includes(dashboard.matchedSessionIds[0] ?? 'missing'), false)
    assert.equal(file.csv.startsWith('\uFEFF'), true)
    assert.match(file.csv, /\r\n/)
  })

  it('neutralizes formula injection and keeps unknown labels honest', () => {
    assert.equal(neutralizeKfzAnalyticsCsvCell('=1+1'), "'=1+1")
    assert.equal(neutralizeKfzAnalyticsCsvCell('+cmd|calc'), "'+cmd|calc")
    assert.equal(neutralizeKfzAnalyticsCsvCell('-2+3'), "'-2+3")
    assert.equal(neutralizeKfzAnalyticsCsvCell('@SUM(A1)'), "'@SUM(A1)")
    assert.equal(neutralizeKfzAnalyticsCsvCell('Bezahlt · Unterlagen'), 'Bezahlt · Unterlagen')
    assert.equal(sanitizeKfzAnalyticsExportText('https://evil.example/?email=max@example.com'), '')
    assert.equal(sanitizeKfzAnalyticsExportText('Max Mustermann <max@example.com>'), '')

    const dashboard = dashboardFor('7d')
    const formulaRow: KfzAnalyticsComparisonRow = {
      ...dashboard.sourceBranchComparisons[0]!,
      label: '=1+1',
    }
    const formulaFile = buildKfzAnalyticsDecisionExport({
      ...dashboard,
      sourceBranchComparisons: [formulaRow],
    })
    assert.match(formulaFile.csv, /"'=1\+1"/)
    assert.doesNotMatch(formulaFile.csv, /"=1\+1"/)

    const urlRow: KfzAnalyticsComparisonRow = {
      ...dashboard.sourceBranchComparisons[0]!,
      label: 'https://evil.example/?email=max@example.com',
    }
    const urlFile = buildKfzAnalyticsDecisionExport({
      ...dashboard,
      sourceBranchComparisons: [urlRow],
    })
    assert.doesNotMatch(urlFile.csv, /https?:\/\/|evil\.example|max@example/)

    const unknown = rowByGroup(parseExportCsv(buildKfzAnalyticsDecisionExport(dashboard).csv), 'Unbekannt')
    assert.ok(unknown)
    assert.equal(unknown[4], '1')
    assert.equal(unknown[5], '')
    assert.equal(unknown[10], '')
  })

  it('exports an honest empty file and repeats the same bytes', () => {
    const emptyDashboard = aggregateKfzAnalyticsDashboard([], {
      periodId: '7d',
      nowMs,
    })
    const first = buildKfzAnalyticsDecisionExport(emptyDashboard)
    const second = buildKfzAnalyticsDecisionExport(emptyDashboard)
    assert.equal(emptyDashboard.empty, true)
    assert.equal(first.rowCount, 0)
    assert.equal(first.csv, second.csv)
    assert.equal(first.filename, second.filename)
    const rows = parseExportCsv(first.csv)
    assert.equal(rows.length, 1)
    assert.deepEqual(rows[0], [...KFZ_ANALYTICS_DECISION_EXPORT_HEADERS])

    const ready = dashboardFor('7d')
    const again = buildKfzAnalyticsDecisionExport(ready)
    const repeat = buildKfzAnalyticsDecisionExport(ready)
    assert.ok(again.rowCount > 0)
    assert.equal(again.csv, repeat.csv)
    assert.equal(again.filename, repeat.filename)

    const authorized = exportKfzAnalyticsDecisionFromLoad({
      ok: true,
      status: 'ready',
      dashboard: ready,
    })
    assert.equal(authorized.ok, true)
    if (!authorized.ok) {
      throw new Error('expected authorized export')
    }
    assert.equal(authorized.csv, again.csv)
  })
})
