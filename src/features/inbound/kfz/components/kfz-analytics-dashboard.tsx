import { dashboardSurfaceClassName } from '@/features/dashboard/lib/dashboard-surface'
import { KfzAnalyticsDashboardFiltersBar } from '@/features/inbound/kfz/components/kfz-analytics-dashboard-filters'
import { KFZ_ANALYTICS_PRIVACY_NOTES } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import {
  kfzAnalyticsQualityStateCopy,
  kfzAnalyticsReviewStateCopy,
  resolveKfzAnalyticsDataQualityState,
  resolveKfzAnalyticsReviewStatus,
} from '@/features/inbound/kfz/lib/kfz-analytics-review-state'
import { formatKfzAnalyticsDisplayDate, isoToKfzAnalyticsDate } from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import {
  KFZ_ANALYTICS_MIN_RATE_GROUP,
  type KfzAnalyticsComparisonRow,
  type KfzAnalyticsCountRow,
  type KfzAnalyticsDashboard,
  type KfzAnalyticsDashboardFilters,
  type KfzAnalyticsDataQuality,
  type KfzAnalyticsPeriodComparison,
  type KfzAnalyticsRecord,
  type KfzAnalyticsReviewStatus,
  type KfzAnalyticsTransitionRow,
} from '@/features/inbound/kfz/types/kfz-analytics'

function formatActiveMs(ms: number | null): string {
  if (ms == null) {
    return '—'
  }
  if (ms < 1000) {
    return '<1 s'
  }
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) {
    return `${seconds} s`
  }
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')} min`
}

function formatRate(rate: number | null): string {
  if (rate == null) {
    return '—'
  }
  return `${(rate * 100).toFixed(1)} %`
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('de-DE').format(value)
}

function maxCount(rows: Array<{ count?: number; reached?: number }>): number {
  return Math.max(1, ...rows.map((row) => row.count ?? row.reached ?? 0))
}

type KfzAnalyticsDashboardViewProps = {
  dashboard: KfzAnalyticsDashboard
  filters?: KfzAnalyticsDashboardFilters
  onFiltersChange?: (filters: KfzAnalyticsDashboardFilters) => void
  defaultPeriodId?: '24h' | '7d' | '30d' | 'all'
  events?: KfzAnalyticsRecord[]
  inspector?: boolean
}

export function KfzAnalyticsDashboardView({
  dashboard,
  filters,
  onFiltersChange,
  defaultPeriodId = '7d',
  events,
  inspector = false,
}: KfzAnalyticsDashboardViewProps) {
  const activeFilters = filters ?? dashboard.filters
  const funnelMax = maxCount(dashboard.steps)
  const inspectorEvents = (events ?? []).filter((event) =>
    dashboard.matchedSessionIds.includes(event.sessionId),
  )

  return (
    <div
      className="space-y-5"
      data-kfz-analytics-dashboard="true"
      data-kfz-analytics-state={dashboard.empty ? 'empty' : 'ready'}
      data-kfz-analytics-filter-active={dashboard.filterActive ? 'true' : 'false'}
      data-kfz-analytics-rates-hidden={dashboard.ratesHidden ? 'true' : 'false'}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Intern · Kfz-Funnel
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          Messung der Kfz-Strecke
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Interne Prüfung anonymer Metadaten: Herkunft, Besuch, gewählter Weg,
          erreichter Schritt, Stopppunkt, Zeit, Übergänge und Versand. Keine
          Formularantworten, Kontaktdaten oder Dateiinhalte.
        </p>
        <p
          className="mt-2 text-xs text-zinc-500"
          data-kfz-analytics-matched={String(dashboard.matchedSessions)}
        >
          {formatCount(dashboard.matchedSessions)} Sitzungen in der Auswahl
        </p>
      </div>

      <KfzAnalyticsDashboardFiltersBar
        dashboard={dashboard}
        filters={activeFilters}
        onChange={onFiltersChange}
        defaultPeriodId={defaultPeriodId}
      />

      <KfzAnalyticsDataQualityCard quality={dashboard.dataQuality} />

      {dashboard.empty ? (
        <div
          className={`${dashboardSurfaceClassName} px-5 py-8`}
          data-kfz-analytics-empty="true"
          data-kfz-analytics-filter-active={dashboard.filterActive ? 'true' : 'false'}
        >
          <p className="text-base font-semibold text-zinc-900">
            {dashboard.filterActive ? 'Keine Sitzungen für diese Auswahl' : 'Noch keine Messdaten'}
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
            {dashboard.filterActive
              ? 'Die Filter treffen auf keine anonymen Sitzungen zu. Es wird nichts hochgerechnet und keine Herkunft erfunden.'
              : 'In diesem Zeitraum liegen keine anonymen Ereignisse vor. Es wird nichts hochgerechnet und keine Herkunft erfunden.'}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard label="Besuche" value={formatCount(dashboard.visits)} testId="visits" />
        <KpiCard
          label="Funnel-Starts"
          value={formatCount(dashboard.funnelStarts)}
          testId="funnel-starts"
        />
        <KpiCard
          label="Anfragen"
          value={formatCount(dashboard.submissions)}
          testId="submissions"
        />
        <KpiCard
          label="Abschlussquote"
          value={formatRate(dashboard.conversionRate)}
          detail={
            dashboard.ratesHidden
              ? `Quote erst ab ${KFZ_ANALYTICS_MIN_RATE_GROUP} Sitzungen`
              : 'Anfragen / Besuche'
          }
          testId="conversion"
        />
        <KpiCard
          label="Startquote"
          value={formatRate(dashboard.startRate)}
          detail={
            dashboard.ratesHidden
              ? `Quote erst ab ${KFZ_ANALYTICS_MIN_RATE_GROUP} Sitzungen`
              : 'Starts / Besuche'
          }
          testId="start-rate"
        />
        <KpiCard
          label="Abschluss der Starts"
          value={formatRate(dashboard.submitFromStartRate)}
          detail={
            dashboard.ratesHidden
              ? `Quote erst ab ${KFZ_ANALYTICS_MIN_RATE_GROUP} Sitzungen`
              : 'Anfragen / Starts'
          }
          testId="submit-from-start"
        />
        <KpiCard
          label="Zeit auf der Seite Ø"
          value={formatActiveMs(dashboard.siteAverageActiveMs)}
          detail={`Median ${formatActiveMs(dashboard.siteMedianActiveMs)}`}
          testId="site-time"
        />
      </div>

      <PeriodComparisonCard comparison={dashboard.periodComparison} />

      <ComparisonTable
        title="Vergleich nach Herkunft"
        empty="Keine Herkunftsdaten. Unbekannte Sitzungen erscheinen als Unbekannt."
        rows={dashboard.sourceComparisons}
        testId="source"
      />
      <ComparisonTable
        title="Vergleich nach Referrer-Kategorie"
        empty="Keine Referrer-Kategorie. Volle URLs werden nicht gespeichert."
        rows={dashboard.referrerComparisons}
        testId="referrer"
      />
      <ComparisonTable
        title="Vergleich nach Einstieg"
        empty="Kein Zweig gewählt. Unbekannter Einstieg bleibt Unbekannt."
        rows={dashboard.branchComparisons}
        testId="branch"
      />

      <section className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5`}>
        <h3 className="text-sm font-semibold text-zinc-900">Funnel nach Schritt</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Erreicht = Sitzungen mit diesem Schritt. Abbruch nur bei Timeout oder
          Seitenende ohne erfolgreichen Versand.
        </p>
        <div className="mt-4 space-y-3" data-kfz-analytics-funnel="true">
          {dashboard.steps.length === 0 ? (
            <p className="text-sm text-zinc-500">Keine Schritt-Daten in diesem Zeitraum.</p>
          ) : (
            dashboard.steps.map((step) => (
              <div key={step.stepId} data-kfz-analytics-step={step.stepId}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-zinc-800">{step.label}</span>
                  <span className="text-xs text-zinc-500">
                    {formatCount(step.reached)} erreicht · {formatCount(step.dropOff)}{' '}
                    Abbruch · {formatRate(step.dropOffRate)}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-3 rounded-full bg-[#003781]"
                    style={{ width: `${Math.max(4, (step.reached / funnelMax) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  aktive Zeit Ø {formatActiveMs(step.averageActiveMs)} · Median{' '}
                  {formatActiveMs(step.medianActiveMs)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <BarCard
          title="Kampagnen"
          rows={dashboard.campaigns}
          empty="Keine allow-listed Kampagnen."
          testId="campaigns"
        />
        <BarCard
          title="Abbruchpunkte"
          rows={dashboard.dropOffs}
          empty="Keine Abbrüche in dieser Auswahl."
          testId="dropoffs"
        />
        <TransitionCard rows={dashboard.transitions} />
        <section className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5 lg:col-span-2`}>
          <h3 className="text-sm font-semibold text-zinc-900">Zeit und Reibung</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <div data-kfz-analytics-site-avg="true">
              <dt className="text-zinc-500">Seite Ø</dt>
              <dd className="mt-0.5 font-semibold text-zinc-900">
                {formatActiveMs(dashboard.siteAverageActiveMs)}
              </dd>
            </div>
            <div data-kfz-analytics-site-median="true">
              <dt className="text-zinc-500">Seite Median</dt>
              <dd className="mt-0.5 font-semibold text-zinc-900">
                {formatActiveMs(dashboard.siteMedianActiveMs)}
              </dd>
            </div>
            <div data-kfz-analytics-landing-avg="true">
              <dt className="text-zinc-500">Landing Ø</dt>
              <dd className="mt-0.5 font-semibold text-zinc-900">
                {formatActiveMs(dashboard.landingAverageActiveMs)}
              </dd>
            </div>
            <div data-kfz-analytics-landing-median="true">
              <dt className="text-zinc-500">Landing Median</dt>
              <dd className="mt-0.5 font-semibold text-zinc-900">
                {formatActiveMs(dashboard.landingMedianActiveMs)}
              </dd>
            </div>
            <div data-kfz-analytics-validation="true">
              <dt className="text-zinc-500">Validierung blockiert</dt>
              <dd className="mt-0.5 font-semibold text-zinc-900">
                {formatCount(dashboard.validationBlocked)}
              </dd>
            </div>
            <div data-kfz-analytics-submit-failed="true">
              <dt className="text-zinc-500">Versand fehlgeschlagen</dt>
              <dd className="mt-0.5 font-semibold text-zinc-900">
                {formatCount(dashboard.submitFailed)}
              </dd>
            </div>
            <div data-kfz-analytics-abandoned="true">
              <dt className="text-zinc-500">Abbrüche</dt>
              <dd className="mt-0.5 font-semibold text-zinc-900">
                {formatCount(dashboard.abandoned)}
              </dd>
            </div>
          </dl>
          {dashboard.submitFailedByCategory.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-zinc-600">
              {dashboard.submitFailedByCategory.map((row) => (
                <li key={row.id}>
                  {row.label}: {formatCount(row.count)}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">
        {KFZ_ANALYTICS_PRIVACY_NOTES.join(' ')}
      </p>

      {inspector ? (
        <section
          className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5`}
          data-kfz-analytics-inspector="true"
        >
          <h3 className="text-sm font-semibold text-zinc-900">Ereignisse (Rohdaten, redigiert)</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Nur zur lokalen Prüfung: keine Antworten, keine Kontaktdaten.
          </p>
          <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-zinc-950 p-3 text-[11px] leading-relaxed text-emerald-100">
            {JSON.stringify(inspectorEvents, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  )
}

function KpiCard({
  label,
  value,
  detail,
  testId,
}: {
  label: string
  value: string
  detail?: string
  testId: string
}) {
  return (
    <div className={`${dashboardSurfaceClassName} px-4 py-3.5`} data-kfz-analytics-kpi={testId}>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
      {detail ? <p className="mt-0.5 text-[11px] text-zinc-500">{detail}</p> : null}
    </div>
  )
}

export function KfzAnalyticsReviewStateView({
  status,
  filterActive = false,
}: {
  status: Exclude<KfzAnalyticsReviewStatus, 'ready'>
  filterActive?: boolean
}) {
  const copy =
    status === 'empty' && filterActive
      ? {
          title: 'Keine Sitzungen für diese Auswahl',
          body: 'Die Filter treffen auf keine anonymen Sitzungen zu. Es wird nichts hochgerechnet und keine Herkunft erfunden.',
        }
      : kfzAnalyticsReviewStateCopy(status)

  return (
    <div
      className={`${dashboardSurfaceClassName} px-5 py-8`}
      data-kfz-analytics-state={status}
      data-kfz-analytics-empty={status === 'empty' ? 'true' : 'false'}
      data-kfz-analytics-filter-active={filterActive ? 'true' : 'false'}
    >
      <p className="text-base font-semibold text-zinc-900">{copy.title}</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">{copy.body}</p>
    </div>
  )
}

function formatQualityCount(value: number, available: boolean): string {
  if (!available) {
    return '—'
  }
  return formatCount(value)
}

export function KfzAnalyticsDataQualityCard({
  quality,
}: {
  quality: KfzAnalyticsDataQuality
}) {
  const copy = kfzAnalyticsQualityStateCopy(quality)
  const rows = [
    { id: 'duplicates', label: 'Duplikate ignoriert', value: quality.duplicateEvents },
    {
      id: 'invalid-transitions',
      label: 'Ungültige Übergänge ignoriert',
      value: quality.invalidTransitions,
    },
    { id: 'rejected-timings', label: 'Verworfene Zeiten', value: quality.rejectedTimings },
    {
      id: 'missing-metadata',
      label: 'Fehlende Sitzungsangaben',
      value: quality.missingSessionMetadata,
    },
    {
      id: 'malformed-source',
      label: 'Ungültige Herkunftskategorien',
      value: quality.malformedSourceCategories,
    },
    {
      id: 'incomplete-sessions',
      label: 'Unvollständige Sitzungen',
      value: quality.incompleteSessions,
    },
  ] as const

  return (
    <section
      className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5`}
      data-kfz-analytics-quality="true"
      data-kfz-analytics-quality-status={quality.status}
      data-kfz-analytics-quality-available={quality.available ? 'true' : 'false'}
    >
      <h3 className="text-sm font-semibold text-zinc-900">{copy.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{copy.body}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.id} data-kfz-analytics-quality-row={row.id}>
            <dt className="text-zinc-500">{row.label}</dt>
            <dd className="mt-0.5 font-semibold text-zinc-900">
              {formatQualityCount(row.value, quality.available)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function KfzAnalyticsReviewScreen({
  status,
  dashboard,
  filters,
  onFiltersChange,
  defaultPeriodId = '7d',
  events,
  inspector = false,
}: {
  status: KfzAnalyticsReviewStatus
  dashboard?: KfzAnalyticsDashboard
  filters?: KfzAnalyticsDashboardFilters
  onFiltersChange?: (filters: KfzAnalyticsDashboardFilters) => void
  defaultPeriodId?: '24h' | '7d' | '30d' | 'all'
  events?: KfzAnalyticsRecord[]
  inspector?: boolean
}) {
  const resolved = resolveKfzAnalyticsReviewStatus({
    loadStatus:
      status === 'unavailable' || status === 'configuration_missing' ? status : 'ready',
    empty: status === 'empty' || dashboard?.empty,
  })

  if (resolved === 'unavailable' || resolved === 'configuration_missing') {
    const quality = resolveKfzAnalyticsDataQualityState({ loadStatus: resolved })
    return (
      <div className="space-y-5" data-kfz-analytics-dashboard="true">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Intern · Kfz-Funnel
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            Messung der Kfz-Strecke
          </h2>
        </div>
        <KfzAnalyticsReviewStateView status={resolved} />
        <KfzAnalyticsDataQualityCard quality={quality} />
      </div>
    )
  }

  if (!dashboard) {
    return <KfzAnalyticsReviewStateView status="unavailable" />
  }

  return (
    <KfzAnalyticsDashboardView
      dashboard={dashboard}
      filters={filters}
      onFiltersChange={onFiltersChange}
      defaultPeriodId={defaultPeriodId}
      events={events}
      inspector={inspector}
    />
  )
}

function TransitionCard({ rows }: { rows: KfzAnalyticsTransitionRow[] }) {
  const widthMax = maxCount(rows)
  return (
    <section
      className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5 lg:col-span-2`}
      data-kfz-analytics-transitions="true"
    >
      <h3 className="text-sm font-semibold text-zinc-900">Übergänge</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Nur Schritt-IDs. Wiederholte gleiche Kanten einer Sitzung zählen einmal.
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Keine Übergänge in dieser Auswahl.</p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <div key={row.id} data-kfz-analytics-transition={row.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-zinc-800">{row.label}</span>
                <span className="text-zinc-500">{formatCount(row.count)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-2.5 rounded-full bg-[#0050aa]"
                  style={{ width: `${Math.max(6, (row.count / widthMax) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function formatComparisonDate(iso: string | null): string {
  return formatKfzAnalyticsDisplayDate(isoToKfzAnalyticsDate(iso))
}

function ComparisonMetric({
  label,
  value,
  testId,
}: {
  label: string
  value: string
  testId: string
}) {
  return (
    <div data-kfz-analytics-comparison-metric={testId}>
      <dt className="text-[11px] text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-zinc-900">{value}</dd>
    </div>
  )
}

function ComparisonTable({
  title,
  empty,
  rows,
  testId,
}: {
  title: string
  empty: string
  rows: KfzAnalyticsComparisonRow[]
  testId: string
}) {
  return (
    <section
      className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5`}
      data-kfz-analytics-comparisons={testId}
    >
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Abschluss und Abbruch nur als Aggregat. Quoten und Stopppunkte erst ab{' '}
        {KFZ_ANALYTICS_MIN_RATE_GROUP} Sitzungen — kleine Gruppen bleiben ehrlich
        und zeigen keine einzelnen Verläufe.
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[720px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-3 font-medium">Gruppe</th>
                <th className="py-2 pr-3 font-medium">Besuche</th>
                <th className="py-2 pr-3 font-medium">Starts</th>
                <th className="py-2 pr-3 font-medium">Anfragen</th>
                <th className="py-2 pr-3 font-medium">Abschluss</th>
                <th className="py-2 pr-3 font-medium">Abbruch</th>
                <th className="py-2 pr-3 font-medium">Schritt</th>
                <th className="py-2 pr-3 font-medium">Stopp</th>
                <th className="py-2 pr-3 font-medium">Übergänge</th>
                <th className="py-2 font-medium">Zeit Ø</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 last:border-0"
                  data-kfz-analytics-comparison-row={row.id}
                  data-kfz-analytics-rates-hidden={row.ratesHidden ? 'true' : 'false'}
                >
                  <td className="py-2.5 pr-3 font-medium text-zinc-800">{row.label}</td>
                  <td className="py-2.5 pr-3 text-zinc-700">{formatCount(row.visits)}</td>
                  <td className="py-2.5 pr-3 text-zinc-700">{formatCount(row.funnelStarts)}</td>
                  <td className="py-2.5 pr-3 text-zinc-700">{formatCount(row.submissions)}</td>
                  <td className="py-2.5 pr-3 text-zinc-700">{formatRate(row.conversionRate)}</td>
                  <td className="py-2.5 pr-3 text-zinc-700">
                    {row.ratesHidden ? '—' : formatRate(row.dropOffRate)}
                  </td>
                  <td className="py-2.5 pr-3 text-zinc-600">
                    {row.topReachedStepLabel ?? '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-zinc-600">
                    {row.topDropOffStepLabel ?? '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-zinc-700">
                    {row.transitionCount == null ? '—' : formatCount(row.transitionCount)}
                  </td>
                  <td className="py-2.5 text-zinc-700">{formatActiveMs(row.averageActiveMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function PeriodComparisonCard({
  comparison,
}: {
  comparison: KfzAnalyticsPeriodComparison
}) {
  const rows = [comparison.current]
  if (comparison.previous) {
    rows.push(comparison.previous)
  }

  return (
    <section
      className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5`}
      data-kfz-analytics-comparisons="period"
      data-kfz-analytics-period-comparison={comparison.available ? 'true' : 'false'}
    >
      <h3 className="text-sm font-semibold text-zinc-900">Vergleich zum vorherigen Zeitraum</h3>
      <p className="mt-1 text-xs text-zinc-500">
        {comparison.available
          ? `Vorheriges Fenster UTC ${formatComparisonDate(comparison.previousFrom)} – ${formatComparisonDate(comparison.previousTo)}. Gleiche Filter, keine einzelnen Sitzungen.`
          : 'Bei „Gesamt“ gibt es keinen Vorzeitraum. Es wird kein Fenster erfunden.'}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-lg bg-zinc-50 px-3 py-3"
            data-kfz-analytics-comparison-row={row.id}
            data-kfz-analytics-rates-hidden={row.ratesHidden ? 'true' : 'false'}
          >
            <p className="text-sm font-semibold text-zinc-900">{row.label}</p>
            <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <ComparisonMetric label="Besuche" value={formatCount(row.visits)} testId="visits" />
              <ComparisonMetric
                label="Starts"
                value={formatCount(row.funnelStarts)}
                testId="starts"
              />
              <ComparisonMetric
                label="Anfragen"
                value={formatCount(row.submissions)}
                testId="submissions"
              />
              <ComparisonMetric
                label="Abschluss"
                value={formatRate(row.conversionRate)}
                testId="conversion"
              />
              <ComparisonMetric
                label="Abbruch"
                value={row.ratesHidden ? '—' : formatRate(row.dropOffRate)}
                testId="dropoff"
              />
              <ComparisonMetric
                label="Zeit Ø"
                value={formatActiveMs(row.averageActiveMs)}
                testId="timing"
              />
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}

function BarCard({
  title,
  rows,
  empty,
  testId,
}: {
  title: string
  rows: KfzAnalyticsCountRow[]
  empty: string
  testId: string
}) {
  const widthMax = maxCount(rows)
  return (
    <section className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5`} data-kfz-analytics-bars={testId}>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <div key={row.id} data-kfz-analytics-bar-row={row.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-zinc-800">{row.label}</span>
                <span className="text-zinc-500">{formatCount(row.count)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-2.5 rounded-full bg-[#0050aa]"
                  style={{ width: `${Math.max(6, (row.count / widthMax) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
