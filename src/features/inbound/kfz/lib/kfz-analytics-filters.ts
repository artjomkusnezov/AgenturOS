import {
  isKfzAnalyticsBranchId,
  isKfzAnalyticsReferrerCategory,
  isKfzAnalyticsStepId,
  isKfzAnalyticsTrafficSource,
  kfzAnalyticsBranchLabel,
  kfzAnalyticsStepLabel,
  KFZ_ANALYTICS_BRANCH_IDS,
  KFZ_ANALYTICS_STEP_IDS,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import { KFZ_ANALYTICS_ACTIVE_MS_CAP } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import { classifyKfzAnalyticsCoarseSource } from '@/features/inbound/kfz/lib/kfz-analytics-traffic-source'
import type {
  KfzAnalyticsBranchFilter,
  KfzAnalyticsCoarseSource,
  KfzAnalyticsDashboardFilters,
  KfzAnalyticsDashboardQuery,
  KfzAnalyticsDropOffFilter,
  KfzAnalyticsPeriodId,
  KfzAnalyticsRecord,
  KfzAnalyticsReferrerCategory,
  KfzAnalyticsStepFilter,
  KfzAnalyticsTrafficSource,
  KfzAnalyticsTrafficSourceFilter,
} from '@/features/inbound/kfz/types/kfz-analytics'
import {
  KFZ_ANALYTICS_FILTER_ALL,
  KFZ_ANALYTICS_TRAFFIC_SOURCES,
  KFZ_ANALYTICS_UNKNOWN_ID,
} from '@/features/inbound/kfz/types/kfz-analytics'

export const KFZ_ANALYTICS_PERIODS: ReadonlyArray<{
  id: Exclude<KfzAnalyticsPeriodId, 'custom'>
  label: string
  durationMs: number | null
}> = [
  { id: '24h', label: '24 Stunden', durationMs: 24 * 60 * 60 * 1000 },
  { id: '7d', label: '7 Tage', durationMs: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: '30 Tage', durationMs: 30 * 24 * 60 * 60 * 1000 },
  { id: '90d', label: '90 Tage', durationMs: 90 * 24 * 60 * 60 * 1000 },
  { id: 'all', label: 'Gesamt', durationMs: null },
]

export const KFZ_ANALYTICS_DECISION_PERIODS = ['7d', '30d', '90d'] as const

export function resolveKfzAnalyticsPeriod(
  periodId: KfzAnalyticsPeriodId,
  nowMs: number,
): { from: string | null; to: string } {
  const spec = KFZ_ANALYTICS_PERIODS.find((entry) => entry.id === periodId)
  const to = new Date(nowMs).toISOString()
  if (!spec || spec.durationMs == null) {
    return { from: null, to }
  }
  return { from: new Date(nowMs - spec.durationMs).toISOString(), to }
}

export const KFZ_ANALYTICS_MAX_RANGE_DAYS = 31
export const KFZ_ANALYTICS_UNKNOWN_LABEL = 'Unbekannt'

const CALENDAR_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const PRESET_PERIODS = new Set<KfzAnalyticsPeriodId>(['24h', '7d', '30d', '90d', 'all'])

export const KFZ_ANALYTICS_DEFAULT_FILTERS: KfzAnalyticsDashboardFilters = {
  periodId: '7d',
  fromDate: null,
  toDate: null,
  trafficSource: KFZ_ANALYTICS_FILTER_ALL,
  branchId: KFZ_ANALYTICS_FILTER_ALL,
  reachedStepId: KFZ_ANALYTICS_FILTER_ALL,
  dropOffStepId: KFZ_ANALYTICS_FILTER_ALL,
}

export type KfzAnalyticsSessionFacts = {
  sessionId: string
  events: KfzAnalyticsRecord[]
  visit: boolean
  funnelStart: boolean
  submitted: boolean
  abandoned: boolean
  trafficSource: KfzAnalyticsTrafficSource | typeof KFZ_ANALYTICS_UNKNOWN_ID
  coarseSource: KfzAnalyticsCoarseSource | typeof KFZ_ANALYTICS_UNKNOWN_ID
  referrerCategory: KfzAnalyticsReferrerCategory | typeof KFZ_ANALYTICS_UNKNOWN_ID
  utmCampaign: string | null
  utmSource: string | null
  branchId: string | typeof KFZ_ANALYTICS_UNKNOWN_ID | null
  reachedStepIds: Set<string>
  dropOffStepId: string | typeof KFZ_ANALYTICS_UNKNOWN_ID | null
  siteActiveMs: number | null
}

export function parseKfzAnalyticsCalendarDate(value: unknown): string | null {
  if (typeof value !== 'string' || !CALENDAR_DATE_RE.test(value)) {
    return null
  }
  const match = CALENDAR_DATE_RE.exec(value)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null
  }
  return value
}

export function kfzAnalyticsDateToStartIso(date: string): string {
  return `${date}T00:00:00.000Z`
}

export function kfzAnalyticsDateToEndIso(date: string): string {
  return `${date}T23:59:59.999Z`
}

export function isoToKfzAnalyticsDate(iso: string | null | undefined): string | null {
  if (!iso || iso.length < 10) {
    return null
  }
  return parseKfzAnalyticsCalendarDate(iso.slice(0, 10))
}

export function addUtcCalendarDays(date: string, days: number): string {
  const utc = new Date(`${date}T00:00:00.000Z`)
  utc.setUTCDate(utc.getUTCDate() + days)
  return utc.toISOString().slice(0, 10)
}

export function kfzAnalyticsInclusiveDayCount(fromDate: string, toDate: string): number {
  const fromMs = Date.parse(kfzAnalyticsDateToStartIso(fromDate))
  const toMs = Date.parse(kfzAnalyticsDateToStartIso(toDate))
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    return 0
  }
  return Math.floor((toMs - fromMs) / 86_400_000) + 1
}

function clampExplicitDateRange(
  fromDate: string,
  toDate: string,
): { fromDate: string; toDate: string } {
  let start = fromDate
  let end = toDate
  if (start > end) {
    start = toDate
    end = fromDate
  }
  const days = kfzAnalyticsInclusiveDayCount(start, end)
  if (days > KFZ_ANALYTICS_MAX_RANGE_DAYS) {
    end = addUtcCalendarDays(start, KFZ_ANALYTICS_MAX_RANGE_DAYS - 1)
  }
  return { fromDate: start, toDate: end }
}

export function parseKfzAnalyticsPeriodId(value: unknown): KfzAnalyticsPeriodId | null {
  if (typeof value !== 'string') {
    return null
  }
  if (value === 'custom' || PRESET_PERIODS.has(value as KfzAnalyticsPeriodId)) {
    return value as KfzAnalyticsPeriodId
  }
  return null
}

export function parseKfzAnalyticsTrafficSourceFilter(
  value: unknown,
): KfzAnalyticsTrafficSourceFilter {
  if (value === KFZ_ANALYTICS_UNKNOWN_ID) {
    return KFZ_ANALYTICS_UNKNOWN_ID
  }
  if (isKfzAnalyticsTrafficSource(value)) {
    return value
  }
  return KFZ_ANALYTICS_FILTER_ALL
}

export function parseKfzAnalyticsBranchFilter(value: unknown): KfzAnalyticsBranchFilter {
  if (value === KFZ_ANALYTICS_UNKNOWN_ID) {
    return KFZ_ANALYTICS_UNKNOWN_ID
  }
  if (typeof value === 'string' && isKfzAnalyticsBranchId(value)) {
    return value
  }
  return KFZ_ANALYTICS_FILTER_ALL
}

export function parseKfzAnalyticsStepFilter(value: unknown): KfzAnalyticsStepFilter {
  if (typeof value === 'string' && isKfzAnalyticsStepId(value)) {
    return value
  }
  return KFZ_ANALYTICS_FILTER_ALL
}

export function parseKfzAnalyticsDropOffFilter(value: unknown): KfzAnalyticsDropOffFilter {
  if (value === KFZ_ANALYTICS_UNKNOWN_ID) {
    return KFZ_ANALYTICS_UNKNOWN_ID
  }
  if (typeof value === 'string' && isKfzAnalyticsStepId(value)) {
    return value
  }
  return KFZ_ANALYTICS_FILTER_ALL
}

export function parseKfzAnalyticsDashboardQuery(
  query:
    | KfzAnalyticsDashboardQuery
    | URLSearchParams
    | Record<string, string | string[] | undefined>,
): KfzAnalyticsDashboardQuery {
  const read = (key: keyof KfzAnalyticsDashboardQuery): string | undefined => {
    if (query instanceof URLSearchParams) {
      return query.get(key) ?? undefined
    }
    const value = query[key]
    if (Array.isArray(value)) {
      return typeof value[0] === 'string' && value[0].trim() ? value[0] : undefined
    }
    return typeof value === 'string' && value.trim() ? value : undefined
  }

  return {
    period: read('period'),
    from: read('from'),
    to: read('to'),
    source: read('source'),
    branch: read('branch'),
    step: read('step'),
    drop: read('drop'),
  }
}

export function resolveKfzAnalyticsDashboardFilters(
  query: KfzAnalyticsDashboardQuery,
  nowMs: number,
  defaultPeriodId: KfzAnalyticsPeriodId = '7d',
): { filters: KfzAnalyticsDashboardFilters; from: string | null; to: string } {
  const fromDateRaw = parseKfzAnalyticsCalendarDate(query.from)
  const toDateRaw = parseKfzAnalyticsCalendarDate(query.to)
  const requestedPeriod = parseKfzAnalyticsPeriodId(query.period)

  const presetPeriod: Exclude<KfzAnalyticsPeriodId, 'custom'> =
    requestedPeriod && requestedPeriod !== 'custom'
      ? requestedPeriod
      : defaultPeriodId === 'custom'
        ? '7d'
        : defaultPeriodId
  const explicitStart = fromDateRaw ?? toDateRaw
  const explicitEnd = toDateRaw ?? fromDateRaw
  const useExplicitDates =
    Boolean(explicitStart && explicitEnd) &&
    (requestedPeriod === 'custom' || !requestedPeriod)

  let periodId: KfzAnalyticsPeriodId = presetPeriod
  let fromDate: string | null = null
  let toDate: string | null = null
  let from: string | null
  let to: string

  if (useExplicitDates && explicitStart && explicitEnd) {
    const clamped = clampExplicitDateRange(explicitStart, explicitEnd)
    periodId = 'custom'
    fromDate = clamped.fromDate
    toDate = clamped.toDate
    from = kfzAnalyticsDateToStartIso(clamped.fromDate)
    to = kfzAnalyticsDateToEndIso(clamped.toDate)
  } else {
    const range = resolveKfzAnalyticsPeriod(presetPeriod, nowMs)
    from = range.from
    to = range.to
  }

  return {
    filters: {
      periodId,
      fromDate,
      toDate,
      trafficSource: parseKfzAnalyticsTrafficSourceFilter(query.source),
      branchId: parseKfzAnalyticsBranchFilter(query.branch),
      reachedStepId: parseKfzAnalyticsStepFilter(query.step),
      dropOffStepId: parseKfzAnalyticsDropOffFilter(query.drop),
    },
    from,
    to,
  }
}

export function kfzAnalyticsDashboardFiltersAreActive(
  filters: KfzAnalyticsDashboardFilters,
): boolean {
  return (
    filters.trafficSource !== KFZ_ANALYTICS_FILTER_ALL ||
    filters.branchId !== KFZ_ANALYTICS_FILTER_ALL ||
    filters.reachedStepId !== KFZ_ANALYTICS_FILTER_ALL ||
    filters.dropOffStepId !== KFZ_ANALYTICS_FILTER_ALL
  )
}

export function buildKfzAnalyticsDashboardQuery(
  filters: KfzAnalyticsDashboardFilters,
): KfzAnalyticsDashboardQuery {
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

export function buildKfzAnalyticsDashboardHref(
  filters: KfzAnalyticsDashboardFilters,
  pathname = '/app/kfz-analytics',
): string {
  const params = new URLSearchParams()
  if (filters.periodId === 'custom' && filters.fromDate && filters.toDate) {
    params.set('from', filters.fromDate)
    params.set('to', filters.toDate)
  } else if (filters.periodId !== '7d') {
    params.set('period', filters.periodId)
  }
  if (filters.trafficSource !== KFZ_ANALYTICS_FILTER_ALL) {
    params.set('source', filters.trafficSource)
  }
  if (filters.branchId !== KFZ_ANALYTICS_FILTER_ALL) {
    params.set('branch', filters.branchId)
  }
  if (filters.reachedStepId !== KFZ_ANALYTICS_FILTER_ALL) {
    params.set('step', filters.reachedStepId)
  }
  if (filters.dropOffStepId !== KFZ_ANALYTICS_FILTER_ALL) {
    params.set('drop', filters.dropOffStepId)
  }
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function kfzAnalyticsTrafficSourceLabel(
  id: string,
): string {
  if (id === 'direct') {
    return 'Direkt'
  }
  if (id === 'utm') {
    return 'UTM'
  }
  if (id === 'campaign') {
    return 'Kampagne'
  }
  if (id === KFZ_ANALYTICS_UNKNOWN_ID) {
    return KFZ_ANALYTICS_UNKNOWN_LABEL
  }
  return id
}

export function kfzAnalyticsDimensionLabel(
  kind: 'source' | 'branch' | 'step' | 'drop',
  id: string,
): string {
  if (id === KFZ_ANALYTICS_FILTER_ALL) {
    return 'Alle'
  }
  if (kind === 'source') {
    return kfzAnalyticsTrafficSourceLabel(id)
  }
  if (kind === 'branch') {
    if (id === KFZ_ANALYTICS_UNKNOWN_ID) {
      return KFZ_ANALYTICS_UNKNOWN_LABEL
    }
    return kfzAnalyticsBranchLabel(id)
  }
  if (id === KFZ_ANALYTICS_UNKNOWN_ID) {
    return KFZ_ANALYTICS_UNKNOWN_LABEL
  }
  return kfzAnalyticsStepLabel(id)
}

export function kfzAnalyticsTrafficSourceFilterOptions(): Array<{
  id: KfzAnalyticsTrafficSourceFilter
  label: string
}> {
  return [
    { id: KFZ_ANALYTICS_FILTER_ALL, label: 'Alle' },
    ...KFZ_ANALYTICS_TRAFFIC_SOURCES.map((id) => ({
      id,
      label: kfzAnalyticsTrafficSourceLabel(id),
    })),
    { id: KFZ_ANALYTICS_UNKNOWN_ID, label: KFZ_ANALYTICS_UNKNOWN_LABEL },
  ]
}

export function kfzAnalyticsBranchFilterOptions(): Array<{
  id: KfzAnalyticsBranchFilter
  label: string
}> {
  return [
    { id: KFZ_ANALYTICS_FILTER_ALL, label: 'Alle' },
    ...KFZ_ANALYTICS_BRANCH_IDS.map((id) => ({
      id,
      label: kfzAnalyticsBranchLabel(id),
    })),
    { id: KFZ_ANALYTICS_UNKNOWN_ID, label: KFZ_ANALYTICS_UNKNOWN_LABEL },
  ]
}

export function kfzAnalyticsStepFilterOptions(): Array<{
  id: KfzAnalyticsStepFilter
  label: string
}> {
  return [
    { id: KFZ_ANALYTICS_FILTER_ALL, label: 'Alle' },
    ...KFZ_ANALYTICS_STEP_IDS.map((id) => ({
      id,
      label: kfzAnalyticsStepLabel(id),
    })),
  ]
}

export function kfzAnalyticsDropOffFilterOptions(): Array<{
  id: KfzAnalyticsDropOffFilter
  label: string
}> {
  return [
    { id: KFZ_ANALYTICS_FILTER_ALL, label: 'Alle' },
    ...KFZ_ANALYTICS_STEP_IDS.map((id) => ({
      id,
      label: kfzAnalyticsStepLabel(id),
    })),
    { id: KFZ_ANALYTICS_UNKNOWN_ID, label: KFZ_ANALYTICS_UNKNOWN_LABEL },
  ]
}

export function deriveKfzAnalyticsSessionFacts(
  sessionId: string,
  sessionEvents: readonly KfzAnalyticsRecord[],
  input: { nowMs: number; abandonAfterMs: number },
): KfzAnalyticsSessionFacts {
  const names = new Set(sessionEvents.map((event) => event.eventName))
  const visit = names.has('landing_view')
  const funnelStart = names.has('funnel_start')
  const submitted = names.has('submit_succeeded')
  const lastEvent = sessionEvents.reduce((latestEvent, event) =>
    event.occurredAt > latestEvent.occurredAt ? event : latestEvent,
  )
  const lastMs = Date.parse(lastEvent.occurredAt)
  const timedOut =
    Number.isFinite(lastMs) && input.nowMs - lastMs >= input.abandonAfterMs
  const abandoned = !submitted && (names.has('funnel_abandoned') || timedOut)

  const trafficEvent = [...sessionEvents]
    .filter((event) => event.eventName === 'traffic_source')
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.eventKey.localeCompare(b.eventKey))
    .at(0)
  const trafficSource = isKfzAnalyticsTrafficSource(trafficEvent?.properties.trafficSource)
    ? trafficEvent.properties.trafficSource
    : KFZ_ANALYTICS_UNKNOWN_ID
  const referrerCategory = isKfzAnalyticsReferrerCategory(
    trafficEvent?.properties.referrerCategory,
  )
    ? trafficEvent.properties.referrerCategory
    : KFZ_ANALYTICS_UNKNOWN_ID
  const utmCampaign = trafficEvent?.properties.utmCampaign ?? null
  const utmSource = trafficEvent?.properties.utmSource ?? null
  const hasApprovedSource =
    isKfzAnalyticsTrafficSource(trafficEvent?.properties.trafficSource) ||
    isKfzAnalyticsReferrerCategory(trafficEvent?.properties.referrerCategory) ||
    Boolean(utmSource) ||
    Boolean(utmCampaign)
  const coarseSource = hasApprovedSource
    ? classifyKfzAnalyticsCoarseSource({
        trafficSource: isKfzAnalyticsTrafficSource(trafficSource)
          ? trafficSource
          : 'direct',
        utmSource,
        utmCampaign,
        referrerCategory: isKfzAnalyticsReferrerCategory(referrerCategory)
          ? referrerCategory
          : null,
      })
    : KFZ_ANALYTICS_UNKNOWN_ID

  const siteCandidates = sessionEvents
    .filter(
      (event) =>
        event.eventName === 'landing_view' ||
        event.eventName === 'submit_started' ||
        event.eventName === 'submit_succeeded' ||
        event.eventName === 'funnel_abandoned',
    )
    .map((event) => event.properties.activeMs)
    .filter((value): value is number => {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return false
      }
      return value <= KFZ_ANALYTICS_ACTIVE_MS_CAP
    })
  const siteActiveMs = siteCandidates.length > 0 ? Math.max(...siteCandidates) : null

  const branchEvent = sessionEvents.find(
    (event) => event.eventName === 'initial_branch_selected' && event.properties.branchId,
  )
  const startBranch = sessionEvents.find(
    (event) => event.eventName === 'funnel_start' && event.properties.branchId,
  )
  const rawBranch = branchEvent?.properties.branchId ?? startBranch?.properties.branchId
  let branchId: KfzAnalyticsSessionFacts['branchId'] = null
  if (isKfzAnalyticsBranchId(rawBranch)) {
    branchId = rawBranch
  } else if (funnelStart || names.has('initial_branch_selected')) {
    branchId = KFZ_ANALYTICS_UNKNOWN_ID
  }

  const reachedStepIds = new Set<string>()
  for (const event of sessionEvents) {
    if (event.eventName === 'step_view' && event.properties.stepId) {
      reachedStepIds.add(event.properties.stepId)
    }
  }

  let dropOffStepId: KfzAnalyticsSessionFacts['dropOffStepId'] = null
  if (abandoned) {
    const explicit = sessionEvents.find((event) => event.eventName === 'funnel_abandoned')
      ?.properties.lastStepId
    if (explicit && isKfzAnalyticsStepId(explicit)) {
      dropOffStepId = explicit
    } else {
      const lastView = [...sessionEvents]
        .filter((event) => event.eventName === 'step_view' && event.properties.stepId)
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
        .at(-1)?.properties.stepId
      dropOffStepId = lastView && isKfzAnalyticsStepId(lastView) ? lastView : KFZ_ANALYTICS_UNKNOWN_ID
    }
  }

  return {
    sessionId,
    events: [...sessionEvents],
    visit,
    funnelStart,
    submitted,
    abandoned,
    trafficSource,
    coarseSource,
    referrerCategory,
    utmCampaign,
    utmSource,
    branchId,
    reachedStepIds,
    dropOffStepId,
    siteActiveMs,
  }
}

export function sessionMatchesKfzAnalyticsFilters(
  facts: KfzAnalyticsSessionFacts,
  filters: KfzAnalyticsDashboardFilters,
): boolean {
  if (
    filters.trafficSource !== KFZ_ANALYTICS_FILTER_ALL &&
    facts.trafficSource !== filters.trafficSource
  ) {
    return false
  }
  if (filters.branchId !== KFZ_ANALYTICS_FILTER_ALL) {
    if (facts.branchId !== filters.branchId) {
      return false
    }
  }
  if (filters.reachedStepId !== KFZ_ANALYTICS_FILTER_ALL) {
    if (!facts.reachedStepIds.has(filters.reachedStepId)) {
      return false
    }
  }
  if (filters.dropOffStepId !== KFZ_ANALYTICS_FILTER_ALL) {
    if (facts.dropOffStepId !== filters.dropOffStepId) {
      return false
    }
  }
  return true
}

export function formatKfzAnalyticsDisplayDate(date: string | null): string {
  if (!date) {
    return '—'
  }
  const parsed = parseKfzAnalyticsCalendarDate(date)
  if (!parsed) {
    return '—'
  }
  const [year, month, day] = parsed.split('-')
  return `${Number(day)}.${Number(month)}.${year}`
}

export function describeKfzAnalyticsTimeRange(
  filters: KfzAnalyticsDashboardFilters,
  range: { from: string | null; to: string },
): string {
  if (filters.periodId === 'custom' && filters.fromDate && filters.toDate) {
    return `Kalendertage UTC ${formatKfzAnalyticsDisplayDate(filters.fromDate)} – ${formatKfzAnalyticsDisplayDate(filters.toDate)}`
  }
  if (filters.periodId === 'all') {
    return 'Kein Kalenderlimit — alle gespeicherten Ereignisse'
  }
  const fromDate = isoToKfzAnalyticsDate(range.from)
  const toDate = isoToKfzAnalyticsDate(range.to)
  return `Rollierendes Fenster ${formatKfzAnalyticsDisplayDate(fromDate)} – ${formatKfzAnalyticsDisplayDate(toDate)}`
}

export function displayedKfzAnalyticsDateValue(
  filters: KfzAnalyticsDashboardFilters,
  bound: 'from' | 'to',
  range: { from: string | null; to: string },
): string {
  if (bound === 'from') {
    if (filters.fromDate) {
      return filters.fromDate
    }
    if (filters.periodId === 'all') {
      return ''
    }
    return isoToKfzAnalyticsDate(range.from) ?? ''
  }
  if (filters.toDate) {
    return filters.toDate
  }
  if (filters.periodId === 'all') {
    return ''
  }
  return isoToKfzAnalyticsDate(range.to) ?? ''
}
