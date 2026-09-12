'use client'

import { useState, useTransition } from 'react'

import { exportKfzAnalyticsDecisionAction } from '@/features/inbound/kfz/actions/export-kfz-analytics-decision'
import { buildKfzAnalyticsDecisionExport } from '@/features/inbound/kfz/lib/kfz-analytics-export'
import { buildKfzAnalyticsDashboardQuery } from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import {
  KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR,
  KFZ_ANALYTICS_UNAVAILABLE_ERROR,
} from '@/features/inbound/kfz/lib/kfz-analytics-review-state'
import type { KfzAnalyticsDashboard } from '@/features/inbound/kfz/types/kfz-analytics'

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function KfzAnalyticsDecisionExportButton({
  dashboard,
  authorized = false,
}: {
  dashboard: KfzAnalyticsDashboard
  authorized?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const local = buildKfzAnalyticsDecisionExport(dashboard)

  function downloadLocal() {
    downloadCsv(local.filename, local.csv)
  }

  function onExport() {
    setError(null)
    if (!authorized) {
      downloadLocal()
      return
    }

    startTransition(async () => {
      const result = await exportKfzAnalyticsDecisionAction(
        buildKfzAnalyticsDashboardQuery(dashboard.filters),
      )
      if (!result.ok) {
        setError(
          result.status === 'configuration_missing'
            ? KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR
            : KFZ_ANALYTICS_UNAVAILABLE_ERROR,
        )
        return
      }
      downloadCsv(result.filename, result.csv)
    })
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        className="aos-btn-secondary min-h-11 px-3.5 text-sm"
        data-kfz-analytics-export="true"
        data-kfz-analytics-export-authorized={authorized ? 'true' : 'false'}
        data-kfz-analytics-export-empty={local.rows.length === 0 ? 'true' : 'false'}
        data-kfz-analytics-export-filename={local.filename}
        disabled={isPending}
        onClick={onExport}
      >
        {isPending ? 'Exportiert …' : 'Auswahl als CSV'}
      </button>
      {error ? (
        <p className="max-w-xs text-xs text-zinc-500" data-kfz-analytics-export-error="true">
          {error}
        </p>
      ) : null}
    </div>
  )
}
