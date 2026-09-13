/**
 * Privacy-safe Kfz period trend comparison.
 * 7/30/90-day equal windows, honest deltas, no inferred small groups.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { aggregateKfzAnalyticsDashboard } from '@/features/inbound/kfz/lib/kfz-analytics-aggregate'
import {
  buildKfzAnalyticsPeriodTrend,
  buildKfzAnalyticsPeriodTrendRow,
  isKfzAnalyticsTrendPeriod,
  resolveKfzAnalyticsPreviousRange,
  resolveKfzAnalyticsTrendRange,
} from '@/features/inbound/kfz/lib/kfz-analytics-compare'
import {
  buildKfzAnalyticsDecisionExport,
  exportKfzAnalyticsDecisionFromLoad,
  kfzAnalyticsDecisionExportHasForbiddenField,
  visibleKfzAnalyticsPeriodTrendExport,
} from '@/features/inbound/kfz/lib/kfz-analytics-export'
import {
  buildKfzAnalyticsPeriodTrendFixture,
  KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS,
} from '@/features/inbound/kfz/lib/kfz-analytics-fixtures'
import { resolveKfzAnalyticsDashboardFilters } from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import {
  KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR,
  KFZ_ANALYTICS_UNAVAILABLE_ERROR,
} from '@/features/inbound/kfz/lib/kfz-analytics-review-state'
import type { KfzAnalyticsComparisonRow } from '@/features/inbound/kfz/types/kfz-analytics'
import { KFZ_ANALYTICS_TREND_PERIODS } from '@/features/inbound/kfz/types/kfz-analytics'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const nowMs = Date.parse('2026-09-09T12:00:00.000Z')

function comparisonRow(
  partial: Partial<KfzAnalyticsComparisonRow> & Pick<KfzAnalyticsComparisonRow, 'id' | 'label'>,
): KfzAnalyticsComparisonRow {
  return {
    sessions: 0,
    visits: 0,
    funnelStarts: 0,
    submissions: 0,
    abandoned: 0,
    ratesHidden: true,
    conversionRate: null,
    startRate: null,
    submitFromStartRate: null,
    dropOffRate: null,
    averageActiveMs: null,
    medianActiveMs: null,
    medianStepActiveMs: null,
    topReachedStepId: null,
    topReachedStepLabel: null,
    topDropOffStepId: null,
    topDropOffStepLabel: null,
    transitionCount: null,
    ...partial,
  }
}

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

describe('kfz analytics period trend windows', () => {
  it('compares only 7/30/90-day equal preceding windows', () => {
    assert.deepEqual([...KFZ_ANALYTICS_TREND_PERIODS], ['7d', '30d', '90d'])
    assert.equal(isKfzAnalyticsTrendPeriod('7d'), true)
    assert.equal(isKfzAnalyticsTrendPeriod('24h'), false)
    assert.equal(isKfzAnalyticsTrendPeriod('all'), false)
    assert.equal(isKfzAnalyticsTrendPeriod('custom'), false)

    for (const periodId of KFZ_ANALYTICS_TREND_PERIODS) {
      const resolved = resolveKfzAnalyticsDashboardFilters({ period: periodId }, nowMs)
      const previous = resolveKfzAnalyticsPreviousRange(resolved.filters, resolved)
      const trend = resolveKfzAnalyticsTrendRange(resolved.filters, resolved)
      assert.ok(previous)
      assert.deepEqual(trend, previous)
      const currentMs = Date.parse(resolved.to) - Date.parse(resolved.from ?? resolved.to)
      const previousMs = Date.parse(previous.to) - Date.parse(previous.from)
      assert.equal(previousMs, currentMs - 1)
      assert.ok(previous.to < (resolved.from ?? ''))
    }

    const day = resolveKfzAnalyticsDashboardFilters({ period: '24h' }, nowMs)
    assert.ok(resolveKfzAnalyticsPreviousRange(day.filters, day))
    assert.equal(resolveKfzAnalyticsTrendRange(day.filters, day), null)

    const all = resolveKfzAnalyticsDashboardFilters({ period: 'all' }, nowMs)
    assert.equal(resolveKfzAnalyticsTrendRange(all.filters, all), null)

    const custom = resolveKfzAnalyticsDashboardFilters(
      { from: '2026-09-03', to: '2026-09-09' },
      nowMs,
    )
    assert.ok(resolveKfzAnalyticsPreviousRange(custom.filters, custom))
    assert.equal(resolveKfzAnalyticsTrendRange(custom.filters, custom), null)
  })

  it('keeps date-boundary events on the correct side of equal windows', () => {
    const improving = buildKfzAnalyticsPeriodTrendFixture({
      nowMs,
      periodId: '7d',
      scenario: 'improving',
    })
    const currentStart = '2026-09-02T12:00:00.000Z'
    const previousEnd = '2026-09-02T11:59:59.999Z'
    assert.equal(
      improving.some((event) => event.occurredAt === '2026-09-02T13:00:00.000Z'),
      true,
    )
    assert.equal(
      improving.some((event) => event.occurredAt === '2026-08-26T13:00:00.000Z'),
      true,
    )

    const boundaryCurrent = improving.map((event) => ({
      ...event,
      occurredAt: currentStart,
      eventKey: `${event.eventKey}:current-edge`,
    }))
    const boundaryPrevious = improving.map((event) => ({
      ...event,
      occurredAt: previousEnd,
      eventKey: `${event.eventKey}:previous-edge`,
    }))

    const currentOnly = aggregateKfzAnalyticsDashboard(boundaryCurrent, {
      periodId: '7d',
      nowMs,
    })
    const previousOnly = aggregateKfzAnalyticsDashboard(boundaryPrevious, {
      periodId: '7d',
      nowMs,
    })
    assert.ok(currentOnly.visits > 0)
    assert.equal(currentOnly.periodTrend.overall?.visits.previous, 0)
    assert.equal(previousOnly.visits, 0)
    assert.ok((previousOnly.periodTrend.overall?.visits.previous ?? 0) > 0)
  })
})

describe('kfz analytics period trend honesty', () => {
  it('shows absolute values and honest deltas for improving, declining and equal groups', () => {
    const paidId = 'paid:upload_documents'

    const improving = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsPeriodTrendFixture({ nowMs, periodId: '7d', scenario: 'improving' }),
      { periodId: '7d', nowMs },
    )
    const improvingPaid = improving.periodTrend.sourceBranch.find((row) => row.id === paidId)
    assert.equal(improving.periodTrend.available, true)
    assert.ok(improvingPaid)
    assert.equal(improvingPaid.presentInPrevious, true)
    assert.equal(improvingPaid.visits.current, 8)
    assert.equal(improvingPaid.visits.previous, 5)
    assert.equal(improvingPaid.visits.delta, 3)
    assert.equal(improvingPaid.visits.direction, 'up')
    assert.equal(improvingPaid.submissions.current, 6)
    assert.equal(improvingPaid.submissions.previous, 2)
    assert.equal(improvingPaid.submissions.delta, 4)
    assert.equal(improvingPaid.conversion.current, 0.75)
    assert.equal(improvingPaid.conversion.previous, 0.4)
    assert.equal(improvingPaid.conversion.delta, 0.35)
    assert.equal(improvingPaid.conversion.direction, 'up')

    const declining = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsPeriodTrendFixture({ nowMs, periodId: '7d', scenario: 'declining' }),
      { periodId: '7d', nowMs },
    )
    const decliningPaid = declining.periodTrend.sourceBranch.find((row) => row.id === paidId)
    assert.ok(decliningPaid)
    assert.equal(decliningPaid.visits.current, 5)
    assert.equal(decliningPaid.visits.previous, 8)
    assert.equal(decliningPaid.visits.delta, -3)
    assert.equal(decliningPaid.visits.direction, 'down')
    assert.equal(decliningPaid.conversion.direction, 'down')

    const equal = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsPeriodTrendFixture({ nowMs, periodId: '7d', scenario: 'equal' }),
      { periodId: '7d', nowMs },
    )
    const equalPaid = equal.periodTrend.sourceBranch.find((row) => row.id === paidId)
    assert.ok(equalPaid)
    assert.equal(equalPaid.visits.current, 5)
    assert.equal(equalPaid.visits.previous, 5)
    assert.equal(equalPaid.visits.delta, 0)
    assert.equal(equalPaid.visits.direction, 'equal')
    assert.equal(equalPaid.submissions.delta, 0)
    assert.equal(equalPaid.conversion.current, 1)
    assert.equal(equalPaid.conversion.previous, 1)
    assert.equal(equalPaid.conversion.delta, 0)
    assert.equal(equalPaid.conversion.direction, 'equal')
  })

  it('keeps suppressed, incomplete and zero-denominator comparisons unknown', () => {
    const suppressed = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsPeriodTrendFixture({ nowMs, periodId: '7d', scenario: 'suppressed' }),
      { periodId: '7d', nowMs },
    )
    const suppressedPaid = suppressed.periodTrend.sourceBranch.find(
      (row) => row.id === 'paid:upload_documents',
    )
    assert.ok(suppressedPaid)
    assert.equal(suppressedPaid.visits.current, 3)
    assert.equal(suppressedPaid.visits.previous, 2)
    assert.equal(suppressedPaid.visits.delta, 1)
    assert.equal(suppressedPaid.currentRatesHidden, true)
    assert.equal(suppressedPaid.previousRatesHidden, true)
    assert.equal(suppressedPaid.conversion.current, null)
    assert.equal(suppressedPaid.conversion.previous, null)
    assert.equal(suppressedPaid.conversion.delta, null)
    assert.equal(suppressedPaid.conversion.direction, 'unknown')
    assert.equal(suppressedPaid.reached.current, null)
    assert.equal(suppressedPaid.reached.previous, null)
    assert.equal(suppressedPaid.medianSiteMs.delta, null)

    const improving = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsPeriodTrendFixture({ nowMs, periodId: '7d', scenario: 'improving' }),
      { periodId: '7d', nowMs },
    )
    const unknown = improving.periodTrend.sourceBranch.find((row) => row.id === 'unknown:unknown')
    assert.ok(unknown)
    assert.equal(unknown.presentInPrevious, false)
    assert.equal(unknown.visits.current, 1)
    assert.equal(unknown.visits.previous, null)
    assert.equal(unknown.visits.delta, null)
    assert.equal(unknown.visits.direction, 'unknown')
    assert.equal(unknown.submissions.delta, null)
    assert.equal(unknown.conversion.direction, 'unknown')

    const empty = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsPeriodTrendFixture({ nowMs, periodId: '7d', scenario: 'empty' }),
      { periodId: '7d', nowMs },
    )
    assert.equal(empty.empty, true)
    assert.equal(empty.periodTrend.available, true)
    assert.equal(empty.periodTrend.sourceBranch.length, 0)
    assert.equal(empty.periodTrend.overall?.visits.current, 0)
    assert.equal(empty.periodTrend.overall?.visits.previous, 0)
    assert.equal(empty.periodTrend.overall?.visits.delta, 0)
    assert.equal(empty.periodTrend.overall?.conversion.delta, null)

    const zeroDenom = buildKfzAnalyticsPeriodTrendRow(
      comparisonRow({
        id: 'paid:upload_documents',
        label: 'Bezahlt · Unterlagen',
        sessions: 5,
        visits: 0,
        submissions: 1,
        ratesHidden: false,
        conversionRate: null,
      }),
      comparisonRow({
        id: 'paid:upload_documents',
        label: 'Bezahlt · Unterlagen',
        sessions: 5,
        visits: 0,
        submissions: 0,
        ratesHidden: false,
        conversionRate: null,
      }),
      true,
    )
    assert.equal(zeroDenom.conversion.current, null)
    assert.equal(zeroDenom.conversion.previous, null)
    assert.equal(zeroDenom.conversion.delta, null)
    assert.equal(zeroDenom.conversion.direction, 'unknown')
    assert.equal(zeroDenom.submissions.delta, 1)

    const missingPrevious = buildKfzAnalyticsPeriodTrend({
      periodId: '7d',
      previousRange: { from: '2026-08-26T12:00:00.000Z', to: '2026-09-02T11:59:59.999Z' },
      current: comparisonRow({
        id: 'current',
        label: 'Aktueller Zeitraum',
        sessions: 8,
        visits: 8,
        submissions: 6,
        ratesHidden: false,
        conversionRate: 0.75,
      }),
      previous: comparisonRow({
        id: 'previous',
        label: 'Vorheriger Zeitraum',
        sessions: 5,
        visits: 5,
        submissions: 2,
        ratesHidden: false,
        conversionRate: 0.4,
      }),
      currentSourceBranch: [
        comparisonRow({
          id: 'paid:upload_documents',
          label: 'Bezahlt · Unterlagen',
          sessions: 8,
          visits: 8,
          submissions: 6,
          ratesHidden: false,
          conversionRate: 0.75,
        }),
      ],
      previousSourceBranch: [],
    })
    assert.equal(missingPrevious.sourceBranch[0]?.presentInPrevious, false)
    assert.equal(missingPrevious.sourceBranch[0]?.visits.previous, null)
    assert.equal(missingPrevious.sourceBranch[0]?.visits.delta, null)
  })

  it('does not invent 7/30/90 trends for other periods and keeps 30/90 honest', () => {
    const all = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS, {
      periodId: 'all',
      nowMs,
    })
    assert.equal(all.periodTrend.available, false)
    assert.equal(all.periodTrend.overall, null)
    assert.equal(all.periodTrend.sourceBranch.length, 0)

    for (const periodId of ['30d', '90d'] as const) {
      const dashboard = aggregateKfzAnalyticsDashboard(
        buildKfzAnalyticsPeriodTrendFixture({ nowMs, periodId, scenario: 'improving' }),
        { periodId, nowMs },
      )
      const paid = dashboard.periodTrend.sourceBranch.find(
        (row) => row.id === 'paid:upload_documents',
      )
      assert.equal(dashboard.periodTrend.available, true, periodId)
      assert.ok(paid, periodId)
      assert.equal(paid.visits.direction, 'up', periodId)
      assert.equal(paid.visits.delta, 3, periodId)
    }
  })
})

describe('kfz analytics period trend privacy and export', () => {
  it('refuses unauthorized export and never writes forbidden fields', () => {
    const unauthorized = exportKfzAnalyticsDecisionFromLoad({
      ok: false,
      status: 'unavailable',
      error: KFZ_ANALYTICS_UNAVAILABLE_ERROR,
    })
    assert.equal(unauthorized.ok, false)
    if (unauthorized.ok) {
      throw new Error('expected denial')
    }
    assert.equal('csv' in unauthorized, false)

    const missing = exportKfzAnalyticsDecisionFromLoad({
      ok: false,
      status: 'configuration_missing',
      error: KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR,
    })
    assert.equal(missing.ok, false)

    const dashboard = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsPeriodTrendFixture({ nowMs, periodId: '7d', scenario: 'improving' }),
      { periodId: '7d', nowMs },
    )
    const serialized = JSON.stringify(dashboard.periodTrend)
    assert.doesNotMatch(serialized, /Mustermann|max@example.com|\+49170|OS-AB|schein\.pdf|Golf/i)
    assert.doesNotMatch(serialized, /sf_class|Selbstbeteiligung|1\.000 €/)
    assert.doesNotMatch(serialized, /user-agent|https?:\/\/|filename|objectKey|freeText|queryString/i)
    assert.doesNotMatch(serialized, /sessionId|aaaaaaaa-aaaa|matchedSessionIds|eventKey/)
    assert.equal(serialized.includes(dashboard.matchedSessionIds[0] ?? 'missing'), false)

    const file = buildKfzAnalyticsDecisionExport(dashboard)
    assert.deepEqual(kfzAnalyticsDecisionExportHasForbiddenField(file.csv), [])
    assert.doesNotMatch(file.csv, /Mustermann|max@example.com|sessionId|filename|objectKey/i)
    assert.doesNotMatch(file.csv, /besser|schlechter|prognose|empfehlung|ursache/i)
  })

  it('exports comparison aggregates with the same suppression and stable bytes', () => {
    const improving = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsPeriodTrendFixture({ nowMs, periodId: '7d', scenario: 'improving' }),
      { periodId: '7d', nowMs },
    )
    const first = buildKfzAnalyticsDecisionExport(improving)
    const second = buildKfzAnalyticsDecisionExport(improving)
    assert.equal(first.csv, second.csv)
    assert.equal(first.filename, second.filename)

    const rows = parseExportCsv(first.csv)
    const paid = rows.find((row) => row[3]?.includes('Bezahlt'))
    const unknown = rows.find((row) => row[3]?.includes('Unbekannt'))
    assert.ok(paid)
    assert.equal(paid[4], '8')
    assert.equal(paid[9], '6')
    assert.equal(paid[10], '75.0')
    assert.equal(paid[11], '5')
    assert.equal(paid[12], '3')
    assert.equal(paid[13], '2')
    assert.equal(paid[14], '4')
    assert.equal(paid[15], '40.0')
    assert.equal(paid[16], '35.0')
    assert.ok(unknown)
    assert.equal(unknown[4], '1')
    assert.equal(unknown[11], '')
    assert.equal(unknown[12], '')
    assert.equal(unknown[15], '')
    assert.equal(unknown[16], '')

    const suppressed = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsPeriodTrendFixture({ nowMs, periodId: '7d', scenario: 'suppressed' }),
      { periodId: '7d', nowMs },
    )
    const suppressedPaid = suppressed.periodTrend.sourceBranch[0]
    assert.ok(suppressedPaid)
    const visible = visibleKfzAnalyticsPeriodTrendExport(suppressedPaid)
    assert.equal(visible.visitsPrevious, '2')
    assert.equal(visible.visitsDelta, '1')
    assert.equal(visible.conversionPrevious, '')
    assert.equal(visible.conversionDelta, '')
    assert.equal(visible.reachedPrevious, '')
    assert.equal(visible.medianSitePrevious, '')

    const empty = buildKfzAnalyticsDecisionExport(
      aggregateKfzAnalyticsDashboard([], { periodId: '7d', nowMs }),
    )
    const emptyAgain = buildKfzAnalyticsDecisionExport(
      aggregateKfzAnalyticsDashboard([], { periodId: '7d', nowMs }),
    )
    assert.equal(empty.csv, emptyAgain.csv)
    assert.equal(parseExportCsv(empty.csv).length, 1)
  })

  it('does not claim causes in the authorized review copy', () => {
    const dashboard = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/components/kfz-analytics-dashboard.tsx'),
      'utf8',
    )
    const exportButton = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/components/kfz-analytics-decision-export-button.tsx'),
      'utf8',
    )
    const action = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/actions/export-kfz-analytics-decision.ts'),
      'utf8',
    )
    const load = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/actions/load-kfz-analytics-dashboard.ts'),
      'utf8',
    )
    assert.match(dashboard, /Keine Ursache, keine Prognose, keine Empfehlung/)
    assert.doesNotMatch(dashboard, /besser|schlechter|wird steigen|deshalb|dank Kampagne/i)
    assert.match(exportButton, /derselben\s+Unterdrückung/)
    assert.match(action, /loadKfzAnalyticsDashboardAction/)
    assert.doesNotMatch(action, /createServiceRoleKfzAnalyticsStore/)
    assert.match(load, /getCurrentUserAgency/)
  })
})

describe('kfz analytics period trend fixtures cover 7/30/90', () => {
  it('builds the same scenario shape for each rolling window', () => {
    for (const periodId of KFZ_ANALYTICS_TREND_PERIODS) {
      const events = buildKfzAnalyticsPeriodTrendFixture({
        nowMs,
        periodId,
        scenario: 'equal',
      })
      assert.ok(events.length > 0, periodId)
      const dashboard = aggregateKfzAnalyticsDashboard(events, { periodId, nowMs })
      assert.equal(dashboard.periodId, periodId)
      assert.equal(dashboard.periodTrend.available, true)
    }
  })
})
