import { isoToKfzAnalyticsDate } from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import { looksLikeForbiddenAnalyticsKey } from '@/features/inbound/kfz/lib/kfz-analytics-redact'
import type {
  KfzAnalyticsComparisonRow,
  KfzAnalyticsDashboard,
  KfzAnalyticsDashboardLoadResult,
} from '@/features/inbound/kfz/types/kfz-analytics'
import { KFZ_ANALYTICS_UNAVAILABLE_ERROR } from '@/features/inbound/kfz/lib/kfz-analytics-review-state'

export const KFZ_ANALYTICS_DECISION_EXPORT_CONTENT_TYPE =
  'text/csv; charset=utf-8' as const

export const KFZ_ANALYTICS_DECISION_EXPORT_HEADERS = [
  'zeitraum',
  'von',
  'bis',
  'gruppe',
  'besuche',
  'erreicht',
  'stopp',
  'median_seite_ms',
  'median_schritt_ms',
  'anfragen',
  'abschluss',
] as const

export const KFZ_ANALYTICS_DECISION_EXPORT_FORBIDDEN_TOKENS = [
  'sessionId',
  'session_id',
  'eventKey',
  'event_key',
  'matchedSessionIds',
  'email',
  'phone',
  'filename',
  'objectKey',
  'object_key',
  'freeText',
  'queryString',
  'userAgent',
  'user-agent',
] as const

const FORMULA_INJECTION_PREFIX = /^[=+\-@\t\r]/

export type KfzAnalyticsDecisionVisibleMetrics = {
  visits: number
  submissions: number
  reachedLabel: string | null
  stopLabel: string | null
  medianSiteMs: number | null
  medianStepMs: number | null
  conversionRate: number | null
  ratesHidden: boolean
}

export type KfzAnalyticsDecisionExportFile = {
  filename: string
  csv: string
  contentType: typeof KFZ_ANALYTICS_DECISION_EXPORT_CONTENT_TYPE
  rowCount: number
}

export type KfzAnalyticsDecisionExportResult =
  | ({ ok: true } & KfzAnalyticsDecisionExportFile)
  | {
      ok: false
      status: 'unavailable' | 'configuration_missing'
      error: string
    }

/**
 * Same suppression as the decision view: below the minimum group size, reached,
 * stop, timing and conversion are absent — not formatted stand-ins.
 */
export function visibleKfzAnalyticsDecisionMetrics(
  row: KfzAnalyticsComparisonRow,
): KfzAnalyticsDecisionVisibleMetrics {
  if (row.ratesHidden) {
    return {
      visits: row.visits,
      submissions: row.submissions,
      reachedLabel: null,
      stopLabel: null,
      medianSiteMs: null,
      medianStepMs: null,
      conversionRate: null,
      ratesHidden: true,
    }
  }
  return {
    visits: row.visits,
    submissions: row.submissions,
    reachedLabel: row.topReachedStepLabel,
    stopLabel: row.topDropOffStepLabel,
    medianSiteMs: row.medianActiveMs,
    medianStepMs: row.medianStepActiveMs,
    conversionRate: row.conversionRate,
    ratesHidden: false,
  }
}

export function formatKfzAnalyticsDecisionExportRate(
  rate: number | null,
): string {
  if (rate == null) {
    return ''
  }
  return (rate * 100).toFixed(1)
}

export function sanitizeKfzAnalyticsExportText(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  if (/https?:\/\//i.test(trimmed) || trimmed.includes('?')) {
    return ''
  }
  if (trimmed.includes('@') && /\S+@\S+\.\S+/.test(trimmed)) {
    return ''
  }
  if (trimmed.length > 64) {
    return ''
  }
  return trimmed
}

export function neutralizeKfzAnalyticsCsvCell(value: string): string {
  if (FORMULA_INJECTION_PREFIX.test(value)) {
    return `'${value}`
  }
  return value
}

export function kfzAnalyticsFiltersToExportQuery(dashboard: KfzAnalyticsDashboard) {
  const filters = dashboard.filters
  return {
    period: filters.periodId,
    from: filters.fromDate ?? undefined,
    to: filters.toDate ?? undefined,
    source: filters.trafficSource,
    branch: filters.branchId,
    step: filters.reachedStepId,
    drop: filters.dropOffStepId,
  }
}

function csvCell(value: string | number, kind: 'text' | 'token' = 'token'): string {
  const prepared = kind === 'text' ? sanitizeKfzAnalyticsExportText(String(value)) : String(value)
  const raw = neutralizeKfzAnalyticsCsvCell(prepared)
  return `"${raw.replaceAll('"', '""')}"`
}

function formatMs(value: number | null): string {
  return value == null ? '' : String(value)
}

function periodFileToken(dashboard: KfzAnalyticsDashboard): string {
  if (dashboard.periodId === 'custom' && dashboard.filters.fromDate && dashboard.filters.toDate) {
    return `${dashboard.filters.fromDate}-${dashboard.filters.toDate}`
  }
  return dashboard.periodId
}

export function kfzAnalyticsDecisionExportFilename(
  dashboard: KfzAnalyticsDashboard,
): string {
  const token = periodFileToken(dashboard).replaceAll(/[^a-z0-9.-]/gi, '-')
  return `kfz-herkunft-einstieg-${token}.csv`
}

export function buildKfzAnalyticsDecisionExport(
  dashboard: KfzAnalyticsDashboard,
): KfzAnalyticsDecisionExportFile {
  const period = dashboard.periodId
  const from = isoToKfzAnalyticsDate(dashboard.from) ?? ''
  const to = isoToKfzAnalyticsDate(dashboard.to) ?? ''
  const lines = [KFZ_ANALYTICS_DECISION_EXPORT_HEADERS.map((header) => csvCell(header)).join(',')]

  for (const row of dashboard.sourceBranchComparisons) {
    const visible = visibleKfzAnalyticsDecisionMetrics(row)
    lines.push(
      [
        csvCell(period),
        csvCell(from),
        csvCell(to),
        csvCell(row.label, 'text'),
        csvCell(visible.visits),
        csvCell(visible.reachedLabel ?? '', 'text'),
        csvCell(visible.stopLabel ?? '', 'text'),
        csvCell(formatMs(visible.medianSiteMs)),
        csvCell(formatMs(visible.medianStepMs)),
        csvCell(visible.submissions),
        csvCell(formatKfzAnalyticsDecisionExportRate(visible.conversionRate)),
      ].join(','),
    )
  }

  return {
    filename: kfzAnalyticsDecisionExportFilename(dashboard),
    csv: `\uFEFF${lines.join('\r\n')}\r\n`,
    contentType: KFZ_ANALYTICS_DECISION_EXPORT_CONTENT_TYPE,
    rowCount: dashboard.sourceBranchComparisons.length,
  }
}

export function exportKfzAnalyticsDecisionFromLoad(
  result: KfzAnalyticsDashboardLoadResult,
): KfzAnalyticsDecisionExportResult {
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      error: result.error,
    }
  }
  return {
    ok: true,
    ...buildKfzAnalyticsDecisionExport(result.dashboard),
  }
}

export function kfzAnalyticsDecisionExportHasForbiddenField(
  csv: string,
): string[] {
  const lowered = csv.toLowerCase()
  const hits: string[] = []
  for (const token of KFZ_ANALYTICS_DECISION_EXPORT_FORBIDDEN_TOKENS) {
    if (lowered.includes(token.toLowerCase())) {
      hits.push(token)
    }
  }
  for (const header of KFZ_ANALYTICS_DECISION_EXPORT_HEADERS) {
    if (looksLikeForbiddenAnalyticsKey(header)) {
      hits.push(header)
    }
  }
  return hits
}

export function unauthorizedKfzAnalyticsDecisionExport(): Extract<
  KfzAnalyticsDecisionExportResult,
  { ok: false }
> {
  return {
    ok: false,
    status: 'unavailable',
    error: KFZ_ANALYTICS_UNAVAILABLE_ERROR,
  }
}
