import { dashboardSurfaceClassName } from '@/features/dashboard/lib/dashboard-surface'
import { KFZ_ANALYTICS_PERIODS } from '@/features/inbound/kfz/lib/kfz-analytics-aggregate'
import { KFZ_ANALYTICS_PRIVACY_NOTES } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import type {
  KfzAnalyticsCountRow,
  KfzAnalyticsDashboard,
  KfzAnalyticsPeriodId,
  KfzAnalyticsRecord,
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
  periodId: KfzAnalyticsPeriodId
  onPeriodChange?: (periodId: KfzAnalyticsPeriodId) => void
  events?: KfzAnalyticsRecord[]
  inspector?: boolean
}

export function KfzAnalyticsDashboardView({
  dashboard,
  periodId,
  onPeriodChange,
  events,
  inspector = false,
}: KfzAnalyticsDashboardViewProps) {
  const funnelMax = maxCount(dashboard.steps)

  return (
    <div className="space-y-5" data-kfz-analytics-dashboard="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Intern · Kfz-Funnel
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            Messung der Kfz-Strecke
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Nur anonyme, allow-listed Ereignisse. Keine Formularantworten, keine
            Kontaktdaten, keine automatische Bewertung.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" data-kfz-analytics-period={periodId}>
          {KFZ_ANALYTICS_PERIODS.map((period) => {
            const active = period.id === periodId
            return (
              <button
                key={period.id}
                type="button"
                data-kfz-analytics-period-option={period.id}
                onClick={() => onPeriodChange?.(period.id)}
                className={`min-h-10 rounded-full px-3.5 text-sm font-medium ${
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50'
                }`}
              >
                {period.label}
              </button>
            )
          })}
        </div>
      </div>

      {dashboard.empty ? (
        <div
          className={`${dashboardSurfaceClassName} px-5 py-8`}
          data-kfz-analytics-empty="true"
        >
          <p className="text-base font-semibold text-zinc-900">Noch keine Messdaten</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
            In diesem Zeitraum liegen keine anonymen Ereignisse vor. Es wird nichts
            hochgerechnet und keine Herkunft erfunden.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          detail="Anfragen / Besuche"
          testId="conversion"
        />
      </div>

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
          title="Herkunft"
          rows={dashboard.trafficSources}
          empty="Keine Herkunftsdaten."
          testId="sources"
        />
        <BarCard
          title="Kampagnen"
          rows={dashboard.campaigns}
          empty="Keine allow-listed Kampagnen."
          testId="campaigns"
        />
        <BarCard
          title="Einstiegswege"
          rows={dashboard.branches}
          empty="Kein Zweig gewählt."
          testId="branches"
        />
        <section className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5`}>
          <h3 className="text-sm font-semibold text-zinc-900">Zeit und Reibung</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
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
            {JSON.stringify(events ?? [], null, 2)}
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
            <div key={row.id}>
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
