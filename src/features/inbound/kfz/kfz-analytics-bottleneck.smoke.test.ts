/**
 * Privacy-safe Kfz funnel bottleneck summary.
 * 7/30/90-day reached, stop and transition counts — no sessions or causes.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { aggregateKfzAnalyticsDashboard } from '@/features/inbound/kfz/lib/kfz-analytics-aggregate'
import {
  buildKfzAnalyticsBottleneckSummary,
  emptyKfzAnalyticsBottleneckSummary,
  isKfzAnalyticsBottleneckPeriod,
  summarizeKfzAnalyticsBottleneckGroup,
} from '@/features/inbound/kfz/lib/kfz-analytics-bottleneck'
import { collectKfzAnalyticsSessionFacts } from '@/features/inbound/kfz/lib/kfz-analytics-compare'
import {
  buildKfzAnalyticsDecisionExport,
  exportKfzAnalyticsDecisionFromLoad,
  kfzAnalyticsDecisionExportHasForbiddenField,
  visibleKfzAnalyticsBottleneckExport,
} from '@/features/inbound/kfz/lib/kfz-analytics-export'
import {
  buildKfzAnalyticsBottleneckFixture,
  cloneKfzAnalyticsSession,
  KFZ_ANALYTICS_BOTTLENECK_SCENARIOS,
  KFZ_ANALYTICS_FIXTURE_COMPLETED,
  KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS,
  KFZ_ANALYTICS_FIXTURE_QUALITY_DIRTY,
  KFZ_ANALYTICS_FIXTURE_UNKNOWN,
} from '@/features/inbound/kfz/lib/kfz-analytics-fixtures'
import { resolveKfzAnalyticsDashboardFilters } from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import { isKfzAnalyticsForwardTransitionAllowed } from '@/features/inbound/kfz/lib/kfz-analytics-quality'
import {
  KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR,
  KFZ_ANALYTICS_UNAVAILABLE_ERROR,
} from '@/features/inbound/kfz/lib/kfz-analytics-review-state'
import { KFZ_ANALYTICS_ABANDON_AFTER_MS } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import type { KfzAnalyticsRecord } from '@/features/inbound/kfz/types/kfz-analytics'
import { KFZ_ANALYTICS_BOTTLENECK_PERIODS } from '@/features/inbound/kfz/types/kfz-analytics'

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

function factsFor(events: readonly KfzAnalyticsRecord[]) {
  const resolved = resolveKfzAnalyticsDashboardFilters({ period: '7d' }, nowMs)
  return collectKfzAnalyticsSessionFacts(events, {
    nowMs,
    abandonAfterMs: KFZ_ANALYTICS_ABANDON_AFTER_MS,
    from: resolved.from,
    to: resolved.to,
  })
}

function numberedSessionId(index: number): string {
  return `bb000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`
}

describe('kfz analytics bottleneck windows', () => {
  it('summarizes only 7/30/90-day windows', () => {
    assert.deepEqual([...KFZ_ANALYTICS_BOTTLENECK_PERIODS], ['7d', '30d', '90d'])
    assert.equal(isKfzAnalyticsBottleneckPeriod('7d'), true)
    assert.equal(isKfzAnalyticsBottleneckPeriod('30d'), true)
    assert.equal(isKfzAnalyticsBottleneckPeriod('90d'), true)
    assert.equal(isKfzAnalyticsBottleneckPeriod('24h'), false)
    assert.equal(isKfzAnalyticsBottleneckPeriod('all'), false)
    assert.equal(isKfzAnalyticsBottleneckPeriod('custom'), false)

    const all = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS, {
      periodId: 'all',
      nowMs,
    })
    assert.equal(all.bottleneck.available, false)
    assert.equal(all.bottleneck.overall, null)
    assert.equal(all.bottleneck.sourceBranch.length, 0)
    assert.deepEqual(all.bottleneck, emptyKfzAnalyticsBottleneckSummary())

    const day = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS, {
      periodId: '24h',
      nowMs,
    })
    assert.equal(day.bottleneck.available, false)

    const custom = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS, {
      nowMs,
      query: { from: '2026-09-03', to: '2026-09-09' },
    })
    assert.equal(custom.periodId, 'custom')
    assert.equal(custom.bottleneck.available, false)
  })
})

describe('kfz analytics bottleneck transitions and stops', () => {
  it('counts allowed transitions once and ignores impossible edges', () => {
    assert.equal(isKfzAnalyticsForwardTransitionAllowed('documents', 'branch'), false)
    assert.equal(isKfzAnalyticsForwardTransitionAllowed('branch', 'documents'), false)
    assert.equal(isKfzAnalyticsForwardTransitionAllowed('branch', 'contact'), true)
    assert.equal(isKfzAnalyticsForwardTransitionAllowed('contact', 'documents'), true)

    const complete = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsBottleneckFixture({ nowMs, periodId: '7d', scenario: 'complete' }),
      { periodId: '7d', nowMs },
    )
    const overall = complete.bottleneck.overall
    assert.ok(overall)
    assert.equal(overall.ratesHidden, false)
    assert.equal(overall.sessions, 5)
    assert.ok(overall.reached.some((row) => row.id === 'branch' && row.count === 5))
    assert.ok(overall.reached.some((row) => row.id === 'contact' && row.count === 5))
    assert.ok(overall.reached.some((row) => row.id === 'documents' && row.count === 5))
    assert.equal(overall.stops.length, 0)
    assert.ok(overall.transitions.some((row) => row.id === 'branch->contact' && row.count === 5))
    assert.ok(overall.transitions.some((row) => row.id === 'contact->documents' && row.count === 5))
    assert.equal(
      overall.transitions.some((row) => row.id === 'branch->documents'),
      false,
    )
    assert.equal(complete.bottleneck.sourceBranch[0]?.id, 'paid:upload_documents')

    const stopped = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsBottleneckFixture({ nowMs, periodId: '7d', scenario: 'stopped' }),
      { periodId: '7d', nowMs },
    )
    assert.ok(stopped.bottleneck.overall)
    assert.ok(stopped.bottleneck.overall.stops.some((row) => row.id === 'usage' && row.count === 5))
    assert.ok(
      stopped.bottleneck.overall.transitions.some(
        (row) => row.id === 'vehicle->registration' && row.count === 5,
      ),
    )
    assert.equal(stopped.bottleneck.sourceBranch[0]?.id, 'direct:switch_car')

    const mixed: KfzAnalyticsRecord[] = []
    for (let index = 0; index < 5; index += 1) {
      const sessionId = numberedSessionId(index + 1)
      const cloned = cloneKfzAnalyticsSession(
        KFZ_ANALYTICS_FIXTURE_COMPLETED,
        sessionId,
        Date.parse('2026-09-08T13:00:00.000Z') - Date.parse('2026-09-09T08:00:00.000Z'),
      )
      mixed.push(...cloned)
      mixed.push({
        eventName: 'step_view',
        eventKey: `${sessionId}:step_view:documents:illegal`,
        sessionId,
        occurredAt: '2026-09-08T13:10:00.000Z',
        properties: { stepId: 'documents', fromStepId: 'branch' },
      })
      mixed.push({
        eventName: 'step_view',
        eventKey: `${sessionId}:step_view:contact:repeat`,
        sessionId,
        occurredAt: '2026-09-08T13:11:00.000Z',
        properties: { stepId: 'contact', fromStepId: 'branch' },
      })
    }

    const dashboard = aggregateKfzAnalyticsDashboard(mixed, { periodId: '7d', nowMs })
    const transitions = dashboard.bottleneck.overall?.transitions ?? []
    assert.ok(transitions.some((row) => row.id === 'branch->contact' && row.count === 5))
    assert.equal(
      transitions.some((row) => row.id === 'branch->documents' || row.id === 'documents->branch'),
      false,
    )

    const dirty = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_QUALITY_DIRTY, {
      periodId: '7d',
      nowMs,
    })
    assert.equal(
      (dirty.bottleneck.overall?.transitions ?? []).some((row) => row.id.includes('documents->branch')),
      false,
    )
    assert.equal(dirty.bottleneck.overall?.ratesHidden, true)
    assert.equal(dirty.bottleneck.overall?.transitions.length, 0)
  })

  it('keeps suppressed, unknown and empty facts absent — never inferred as zero', () => {
    const suppressed = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsBottleneckFixture({ nowMs, periodId: '7d', scenario: 'suppressed' }),
      { periodId: '7d', nowMs },
    )
    assert.equal(suppressed.bottleneck.available, true)
    assert.equal(suppressed.bottleneck.overall?.sessions, 3)
    assert.equal(suppressed.bottleneck.overall?.ratesHidden, true)
    assert.deepEqual(suppressed.bottleneck.overall?.reached, [])
    assert.deepEqual(suppressed.bottleneck.overall?.stops, [])
    assert.deepEqual(suppressed.bottleneck.overall?.transitions, [])
    assert.equal(suppressed.bottleneck.sourceBranch[0]?.ratesHidden, true)
    assert.deepEqual(suppressed.bottleneck.sourceBranch[0]?.reached, [])

    const unknown = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsBottleneckFixture({ nowMs, periodId: '7d', scenario: 'unknown' }),
      { periodId: '7d', nowMs },
    )
    assert.equal(unknown.bottleneck.sourceBranch[0]?.id, 'unknown:unknown')
    assert.equal(unknown.bottleneck.sourceBranch[0]?.ratesHidden, true)
    assert.deepEqual(unknown.bottleneck.sourceBranch[0]?.stops, [])
    assert.equal(unknown.bottleneck.overall?.ratesHidden, true)

    const empty = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsBottleneckFixture({ nowMs, periodId: '7d', scenario: 'empty' }),
      { periodId: '7d', nowMs },
    )
    assert.equal(empty.empty, true)
    assert.equal(empty.bottleneck.available, true)
    assert.equal(empty.bottleneck.overall?.sessions, 0)
    assert.equal(empty.bottleneck.overall?.ratesHidden, true)
    assert.deepEqual(empty.bottleneck.overall?.reached, [])
    assert.deepEqual(empty.bottleneck.overall?.stops, [])
    assert.deepEqual(empty.bottleneck.overall?.transitions, [])
    assert.equal(empty.bottleneck.sourceBranch.length, 0)

    const group = summarizeKfzAnalyticsBottleneckGroup(factsFor(KFZ_ANALYTICS_FIXTURE_UNKNOWN), {
      id: 'unknown:unknown',
      label: 'Unbekannt · Unbekannt',
    })
    assert.equal(group.ratesHidden, true)
    assert.equal(group.reached.length, 0)
    assert.equal(group.stops.length, 0)
    assert.equal(JSON.stringify(group).includes('0'), false)

    const missing = buildKfzAnalyticsBottleneckSummary({
      periodId: '7d',
      facts: [],
    })
    assert.equal(missing.available, true)
    assert.equal(missing.sourceBranch.length, 0)
    assert.equal(missing.overall?.sessions, 0)
  })

  it('keeps 7/30/90-day source × branch facts honest', () => {
    const seven = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS, {
      periodId: '7d',
      nowMs,
    })
    const thirty = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS, {
      periodId: '30d',
      nowMs,
    })
    const ninety = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS, {
      periodId: '90d',
      nowMs,
    })

    assert.equal(seven.bottleneck.available, true)
    assert.ok(seven.bottleneck.sourceBranch.some((row) => row.id === 'paid:upload_documents'))
    assert.equal(
      seven.bottleneck.sourceBranch.some((row) => row.id === 'organic:first_car'),
      false,
    )
    const paid = seven.bottleneck.sourceBranch.find((row) => row.id === 'paid:upload_documents')
    assert.ok(paid)
    assert.equal(paid.ratesHidden, false)
    assert.ok(paid.reached.some((row) => row.id === 'documents' && row.count === 5))
    assert.equal(paid.stops.length, 0)
    const paidEvb = seven.bottleneck.sourceBranch.find((row) => row.id === 'paid:evb')
    assert.ok(paidEvb)
    assert.equal(paidEvb.ratesHidden, true)
    assert.equal(paidEvb.reached.length, 0)

    assert.ok(thirty.bottleneck.sourceBranch.some((row) => row.id === 'organic:first_car'))
    assert.equal(
      thirty.bottleneck.sourceBranch.some((row) => row.id === 'referral:additional_car'),
      false,
    )
    assert.ok(ninety.bottleneck.sourceBranch.some((row) => row.id === 'referral:additional_car'))

    for (const periodId of KFZ_ANALYTICS_BOTTLENECK_PERIODS) {
      const events = buildKfzAnalyticsBottleneckFixture({
        nowMs,
        periodId,
        scenario: 'complete',
      })
      const dashboard = aggregateKfzAnalyticsDashboard(events, { periodId, nowMs })
      assert.equal(dashboard.periodId, periodId)
      assert.equal(dashboard.bottleneck.available, true)
      assert.equal(dashboard.bottleneck.overall?.sessions, 5)
      assert.ok(dashboard.bottleneck.overall?.transitions.some((row) => row.id === 'branch->contact'))
    }
  })
})

describe('kfz analytics bottleneck privacy and export', () => {
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
      buildKfzAnalyticsBottleneckFixture({ nowMs, periodId: '7d', scenario: 'complete' }),
      { periodId: '7d', nowMs },
    )
    const serialized = JSON.stringify(dashboard.bottleneck)
    assert.doesNotMatch(serialized, /Mustermann|max@example.com|\+49170|OS-AB|schein\.pdf|Golf/i)
    assert.doesNotMatch(serialized, /sf_class|Selbstbeteiligung|1\.000 €/)
    assert.doesNotMatch(serialized, /user-agent|https?:\/\/|filename|objectKey|freeText|queryString/i)
    assert.doesNotMatch(serialized, /sessionId|aaaaaaaa-aaaa|matchedSessionIds|eventKey/)
    assert.equal(serialized.includes(dashboard.matchedSessionIds[0] ?? 'missing'), false)
    assert.ok(!('sessionId' in (dashboard.bottleneck.overall ?? {})))

    const file = buildKfzAnalyticsDecisionExport(dashboard)
    assert.deepEqual(kfzAnalyticsDecisionExportHasForbiddenField(file.csv), [])
    assert.doesNotMatch(file.csv, /Mustermann|max@example.com|sessionId|filename|objectKey/i)
    assert.doesNotMatch(file.csv, /besser|schlechter|prognose|empfehlung|ursache/i)
  })

  it('exports bottleneck aggregates with the same suppression and stable bytes', () => {
    const complete = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsBottleneckFixture({ nowMs, periodId: '7d', scenario: 'complete' }),
      { periodId: '7d', nowMs },
    )
    const first = buildKfzAnalyticsDecisionExport(complete)
    const second = buildKfzAnalyticsDecisionExport(complete)
    assert.equal(first.csv, second.csv)
    assert.equal(first.filename, second.filename)

    const rows = parseExportCsv(first.csv)
    const paid = rows.find((row) => row[3]?.includes('Bezahlt'))
    assert.ok(paid)
    assert.equal(paid[5], 'Unterlagen')
    assert.equal(paid[23], '5')
    assert.equal(paid[24], '')
    assert.equal(paid[25], 'Start → Kontakt')
    assert.equal(paid[26], '5')

    const suppressed = aggregateKfzAnalyticsDashboard(
      buildKfzAnalyticsBottleneckFixture({ nowMs, periodId: '7d', scenario: 'suppressed' }),
      { periodId: '7d', nowMs },
    )
    const visible = visibleKfzAnalyticsBottleneckExport(
      suppressed.bottleneck.sourceBranch[0],
      suppressed.sourceBranchComparisons[0],
    )
    assert.equal(visible.reachedCount, '')
    assert.equal(visible.stopCount, '')
    assert.equal(visible.transitionLabel, '')
    assert.equal(visible.transitionCount, '')
    const suppressedRow = parseExportCsv(buildKfzAnalyticsDecisionExport(suppressed).csv).find(
      (row) => row[3]?.includes('Bezahlt'),
    )
    assert.ok(suppressedRow)
    assert.equal(suppressedRow[23], '')
    assert.equal(suppressedRow[24], '')
    assert.equal(suppressedRow[25], '')
    assert.equal(suppressedRow[26], '')

    const unknownDash = aggregateKfzAnalyticsDashboard(
      [
        ...buildKfzAnalyticsBottleneckFixture({ nowMs, periodId: '7d', scenario: 'complete' }),
        ...cloneKfzAnalyticsSession(
          buildKfzAnalyticsBottleneckFixture({ nowMs, periodId: '7d', scenario: 'unknown' }),
          numberedSessionId(90),
        ),
      ],
      { periodId: '7d', nowMs },
    )
    const unknownRow = parseExportCsv(buildKfzAnalyticsDecisionExport(unknownDash).csv).find(
      (row) => row[3]?.includes('Unbekannt'),
    )
    assert.ok(unknownRow)
    assert.equal(unknownRow[23], '')
    assert.equal(unknownRow[24], '')
    assert.equal(unknownRow[25], '')

    const empty = buildKfzAnalyticsDecisionExport(
      aggregateKfzAnalyticsDashboard([], { periodId: '7d', nowMs }),
    )
    const emptyAgain = buildKfzAnalyticsDecisionExport(
      aggregateKfzAnalyticsDashboard([], { periodId: '7d', nowMs }),
    )
    assert.equal(empty.csv, emptyAgain.csv)
    assert.equal(parseExportCsv(empty.csv).length, 1)
    assert.equal(empty.csv.includes('=1+1'), false)
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
    const bottleneck = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/lib/kfz-analytics-bottleneck.ts'),
      'utf8',
    )
    assert.match(dashboard, /data-kfz-analytics-bottleneck/)
    assert.match(dashboard, /Keine Ursache, keine Prognose, keine Empfehlung/)
    assert.doesNotMatch(dashboard, /besser|schlechter|wird steigen|deshalb|dank Kampagne/i)
    assert.match(exportButton, /derselben\s+Unterdrückung/)
    assert.match(action, /loadKfzAnalyticsDashboardAction/)
    assert.doesNotMatch(action, /createServiceRoleKfzAnalyticsStore/)
    assert.match(load, /getCurrentUserAgency/)
    assert.doesNotMatch(bottleneck, /matchedSessionIds/)
  })
})

describe('kfz analytics bottleneck fixtures cover 7/30/90', () => {
  it('builds the same scenario shape for each rolling window', () => {
    for (const periodId of KFZ_ANALYTICS_BOTTLENECK_PERIODS) {
      for (const scenario of KFZ_ANALYTICS_BOTTLENECK_SCENARIOS) {
        const events = buildKfzAnalyticsBottleneckFixture({
          nowMs,
          periodId,
          scenario,
        })
        if (scenario === 'empty') {
          assert.equal(events.length, 0, `${periodId}:${scenario}`)
        } else {
          assert.ok(events.length > 0, `${periodId}:${scenario}`)
        }
        const dashboard = aggregateKfzAnalyticsDashboard(events, { periodId, nowMs })
        assert.equal(dashboard.periodId, periodId)
        assert.equal(dashboard.bottleneck.available, true)
      }
    }
  })
})
