import { kfzAnalyticsRatesHidden } from '@/features/inbound/kfz/lib/kfz-analytics-compare'
import { KFZ_ANALYTICS_PERIODS } from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import {
  KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR,
  KFZ_ANALYTICS_UNAVAILABLE_ERROR,
} from '@/features/inbound/kfz/lib/kfz-analytics-review-state'
import type {
  KfzAnalyticsComparisonRow,
  KfzAnalyticsDashboard,
  KfzAnalyticsDashboardLoadResult,
  KfzAnalyticsDecisionExport,
  KfzAnalyticsDecisionExportResult,
  KfzAnalyticsDecisionExportRow,
  KfzAnalyticsPeriodId,
} from '@/features/inbound/kfz/types/kfz-analytics'
import { KFZ_ANALYTICS_MIN_RATE_GROUP } from '@/features/inbound/kfz/types/kfz-analytics'

export const KFZ_ANALYTICS_DECISION_EXPORT_DELIMITER = ';' as const

export const KFZ_ANALYTICS_DECISION_EXPORT_HEADERS = [
  'Zeitraum',
  'Von',
  'Bis',
  'Gruppe',
  'Besuche',
  'Erreicht',
  'Stopp',
  'Median Seite ms',
  'Median Schritt ms',
  'Anfragen',
  'Abschluss',
] as const

export const KFZ_ANALYTICS_EXPORT_SUPPRESSED =
  `Zu klein (<${KFZ_ANALYTICS_MIN_RATE_GROUP})` as const

export const KFZ_ANALYTICS_EXPORT_EMPTY = '' as const

const FORMULA_INJECTION_RE = /^[=+\-@\t\r\n]/

export function neutralizeKfzAnalyticsCsvFormula(value: string): string {
  if (value.length === 0) {
    return value
  }
  if (FORMULA_INJECTION_RE.test(value)) {
    return `'${value}`
  }
  return value
}

function escapeKfzAnalyticsCsvCell(value: string): string {
  const neutralized = neutralizeKfzAnalyticsCsvFormula(value)
  if (/[;"\n\r]/.test(neutralized)) {
    return `"${neutralized.replaceAll('"', '""')}"`
  }
  return neutralized
}

function formatExportRate(rate: number | null): string {
  if (rate == null) {
    return KFZ_ANALYTICS_EXPORT_EMPTY
  }
  return `${(rate * 100).toFixed(1)} %`
}

function formatExportCount(value: number): string {
  return String(value)
}

function formatExportTiming(ms: number | null): string {
  if (ms == null) {
    return KFZ_ANALYTICS_EXPORT_EMPTY
  }
  return String(ms)
}

export function kfzAnalyticsDecisionExportPeriodLabel(
  periodId: KfzAnalyticsPeriodId,
): string {
  if (periodId === 'custom') {
    return 'Kalender'
  }
  return KFZ_ANALYTICS_PERIODS.find((entry) => entry.id === periodId)?.label ?? periodId
}

export function kfzAnalyticsDecisionExportFilename(
  dashboard: Pick<KfzAnalyticsDashboard, 'periodId' | 'filters'>,
): string {
  if (
    dashboard.periodId === 'custom' &&
    dashboard.filters.fromDate &&
    dashboard.filters.toDate
  ) {
    return `kfz-herkunft-einstieg-${dashboard.filters.fromDate}-${dashboard.filters.toDate}.csv`
  }
  const slug = dashboard.periodId === 'all' ? 'gesamt' : dashboard.periodId
  return `kfz-herkunft-einstieg-${slug}.csv`
}

function presentDecisionExportRow(
  row: KfzAnalyticsComparisonRow,
  period: { label: string; from: string; to: string },
): KfzAnalyticsDecisionExportRow {
  const suppressed = row.ratesHidden || kfzAnalyticsRatesHidden(row.sessions)
  return {
    period: period.label,
    from: period.from,
    to: period.to,
    group: row.label,
    visits: row.visits,
    reached: suppressed ? KFZ_ANALYTICS_EXPORT_EMPTY : (row.topReachedStepLabel ?? KFZ_ANALYTICS_EXPORT_EMPTY),
    stop: suppressed ? KFZ_ANALYTICS_EXPORT_EMPTY : (row.topDropOffStepLabel ?? KFZ_ANALYTICS_EXPORT_EMPTY),
    medianSiteMs: suppressed
      ? KFZ_ANALYTICS_EXPORT_EMPTY
      : formatExportTiming(row.medianActiveMs),
    medianStepMs: suppressed
      ? KFZ_ANALYTICS_EXPORT_EMPTY
      : formatExportTiming(row.medianStepActiveMs),
    submissions: row.submissions,
    conversion: suppressed
      ? KFZ_ANALYTICS_EXPORT_SUPPRESSED
      : formatExportRate(row.conversionRate),
  }
}

function serializeDecisionExportRow(row: KfzAnalyticsDecisionExportRow): string {
  return [
    row.period,
    row.from,
    row.to,
    row.group,
    formatExportCount(row.visits),
    row.reached,
    row.stop,
    row.medianSiteMs,
    row.medianStepMs,
    formatExportCount(row.submissions),
    row.conversion,
  ]
    .map((cell) => escapeKfzAnalyticsCsvCell(cell))
    .join(KFZ_ANALYTICS_DECISION_EXPORT_DELIMITER)
}

export function buildKfzAnalyticsDecisionExport(
  dashboard: KfzAnalyticsDashboard,
): KfzAnalyticsDecisionExport {
  const period = {
    label: kfzAnalyticsDecisionExportPeriodLabel(dashboard.periodId),
    from: dashboard.from ?? KFZ_ANALYTICS_EXPORT_EMPTY,
    to: dashboard.to,
  }
  const rows = dashboard.sourceBranchComparisons.map((row) =>
    presentDecisionExportRow(row, period),
  )
  const header = KFZ_ANALYTICS_DECISION_EXPORT_HEADERS.map((cell) =>
    escapeKfzAnalyticsCsvCell(cell),
  ).join(KFZ_ANALYTICS_DECISION_EXPORT_DELIMITER)
  const lines = [header, ...rows.map((row) => serializeDecisionExportRow(row))]
  return {
    filename: kfzAnalyticsDecisionExportFilename(dashboard),
    csv: `\uFEFF${lines.join('\n')}\n`,
    rows,
  }
}

export function authorizeKfzAnalyticsDecisionExport(
  result: KfzAnalyticsDashboardLoadResult,
): KfzAnalyticsDecisionExportResult {
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      error:
        result.status === 'configuration_missing'
          ? KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR
          : KFZ_ANALYTICS_UNAVAILABLE_ERROR,
    }
  }

  const exported = buildKfzAnalyticsDecisionExport(result.dashboard)
  return {
    ok: true,
    status: 'ready',
    filename: exported.filename,
    csv: exported.csv,
    rowCount: exported.rows.length,
  }
}
