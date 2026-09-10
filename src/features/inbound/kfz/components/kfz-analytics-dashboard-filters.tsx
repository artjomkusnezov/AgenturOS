import {
  displayedKfzAnalyticsDateValue,
  kfzAnalyticsBranchFilterOptions,
  kfzAnalyticsDropOffFilterOptions,
  kfzAnalyticsStepFilterOptions,
  kfzAnalyticsTrafficSourceFilterOptions,
  KFZ_ANALYTICS_MAX_RANGE_DAYS,
  KFZ_ANALYTICS_PERIODS,
} from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import type {
  KfzAnalyticsDashboard,
  KfzAnalyticsDashboardFilters,
  KfzAnalyticsPeriodId,
} from '@/features/inbound/kfz/types/kfz-analytics'

type KfzAnalyticsDashboardFiltersProps = {
  dashboard: KfzAnalyticsDashboard
  filters: KfzAnalyticsDashboardFilters
  onChange?: (next: KfzAnalyticsDashboardFilters) => void
  defaultPeriodId?: Exclude<KfzAnalyticsPeriodId, 'custom'>
}

function selectClassName(): string {
  return 'aos-select aos-select-touch'
}

export function KfzAnalyticsDashboardFiltersBar({
  dashboard,
  filters,
  onChange,
  defaultPeriodId = '7d',
}: KfzAnalyticsDashboardFiltersProps) {
  const fromValue = displayedKfzAnalyticsDateValue(filters, 'from', dashboard)
  const toValue = displayedKfzAnalyticsDateValue(filters, 'to', dashboard)

  function emit(next: KfzAnalyticsDashboardFilters) {
    onChange?.(next)
  }

  function setPeriod(periodId: Exclude<KfzAnalyticsPeriodId, 'custom'>) {
    emit({
      ...filters,
      periodId,
      fromDate: null,
      toDate: null,
    })
  }

  function setDates(fromDate: string, toDate: string) {
    emit({
      ...filters,
      periodId: 'custom',
      fromDate: fromDate || null,
      toDate: toDate || fromDate || null,
    })
  }

  function reset() {
    emit({
      periodId: defaultPeriodId,
      fromDate: null,
      toDate: null,
      trafficSource: 'all',
      branchId: 'all',
      reachedStepId: 'all',
      dropOffStepId: 'all',
    })
  }

  return (
    <section
      className="rounded-xl bg-[var(--aos-color-surface)] px-4 py-4 shadow-[var(--aos-shadow-zentrale-panel)] ring-1 ring-white/60 sm:px-5"
      data-kfz-analytics-filters="true"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Faktische Aufschlüsselung</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Nur allow-listed Ereignisse. Leere oder unbekannte Werte bleiben unbekannt.
            Zeitraum höchstens {KFZ_ANALYTICS_MAX_RANGE_DAYS} Tage.
          </p>
        </div>
        <button
          type="button"
          className="aos-btn-secondary min-h-11 px-3.5 text-sm"
          data-kfz-analytics-filter-reset="true"
          onClick={reset}
        >
          Filter zurücksetzen
        </button>
      </div>

      <div
        className="mt-3 flex flex-wrap gap-1.5"
        data-kfz-analytics-period={filters.periodId}
      >
        {KFZ_ANALYTICS_PERIODS.map((period) => {
          const active = period.id === filters.periodId
          return (
            <button
              key={period.id}
              type="button"
              data-kfz-analytics-period-option={period.id}
              onClick={() => setPeriod(period.id)}
              className={`min-h-11 rounded-full px-3.5 text-sm font-medium ${
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

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">Von</span>
          <input
            type="date"
            className="aos-input min-h-11"
            data-kfz-analytics-date-from="true"
            value={fromValue}
            max={toValue || undefined}
            onChange={(event) => setDates(event.target.value, toValue)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">Bis</span>
          <input
            type="date"
            className="aos-input min-h-11"
            data-kfz-analytics-date-to="true"
            value={toValue}
            min={fromValue || undefined}
            onChange={(event) => setDates(fromValue, event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">Herkunft</span>
          <select
            className={selectClassName()}
            data-kfz-analytics-filter="source"
            value={filters.trafficSource}
            onChange={(event) =>
              emit({
                ...filters,
                trafficSource: event.target.value as KfzAnalyticsDashboardFilters['trafficSource'],
              })
            }
          >
            {kfzAnalyticsTrafficSourceFilterOptions().map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">Einstieg</span>
          <select
            className={selectClassName()}
            data-kfz-analytics-filter="branch"
            value={filters.branchId}
            onChange={(event) =>
              emit({
                ...filters,
                branchId: event.target.value,
              })
            }
          >
            {kfzAnalyticsBranchFilterOptions().map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">
            Erreichter Schritt
          </span>
          <select
            className={selectClassName()}
            data-kfz-analytics-filter="step"
            value={filters.reachedStepId}
            onChange={(event) =>
              emit({
                ...filters,
                reachedStepId: event.target.value,
              })
            }
          >
            {kfzAnalyticsStepFilterOptions().map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">Abbruchpunkt</span>
          <select
            className={selectClassName()}
            data-kfz-analytics-filter="drop"
            value={filters.dropOffStepId}
            onChange={(event) =>
              emit({
                ...filters,
                dropOffStepId: event.target.value,
              })
            }
          >
            {kfzAnalyticsDropOffFilterOptions().map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
