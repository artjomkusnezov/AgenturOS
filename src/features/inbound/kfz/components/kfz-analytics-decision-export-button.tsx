'use client'

import { useState, useTransition } from 'react'

import { exportKfzAnalyticsDecisionAction } from '@/features/inbound/kfz/actions/export-kfz-analytics-decision'
import {
  buildKfzAnalyticsDecisionExport,
  kfzAnalyticsFiltersToExportQuery,
} from '@/features/inbound/kfz/lib/kfz-analytics-export'
import type { KfzAnalyticsDashboard } from '@/features/inbound/kfz/types/kfz-analytics'

function triggerCsvDownload(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(href)
}

export function KfzAnalyticsDecisionExportButton({
  dashboard,
  mode = 'local',
}: {
  dashboard: KfzAnalyticsDashboard
  mode?: 'local' | 'authorized'
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const preview = buildKfzAnalyticsDecisionExport(dashboard)

  function downloadLocal() {
    setError(null)
    triggerCsvDownload(preview.filename, preview.csv)
  }

  function downloadAuthorized() {
    startTransition(async () => {
      setError(null)
      const result = await exportKfzAnalyticsDecisionAction(
        kfzAnalyticsFiltersToExportQuery(dashboard),
      )
      if (!result.ok) {
        setError(result.error)
        return
      }
      triggerCsvDownload(result.filename, result.csv)
    })
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        className="aos-btn-secondary min-h-11 px-3.5 text-sm"
        data-kfz-analytics-export="true"
        data-kfz-analytics-export-mode={mode}
        data-kfz-analytics-export-period={dashboard.periodId}
        data-kfz-analytics-export-empty={preview.rowCount === 0 ? 'true' : 'false'}
        data-kfz-analytics-export-filename={preview.filename}
        disabled={isPending}
        onClick={mode === 'authorized' ? downloadAuthorized : downloadLocal}
      >
        {isPending ? 'Exportiert …' : 'Aggregat exportieren'}
      </button>
      <p className="max-w-xs text-[11px] leading-relaxed text-zinc-500">
        Nur die aktuelle Auswahl als CSV. Vorperiode nur mit derselben
        Unterdrückung. Keine Sitzungen, Antworten oder Kontakte.
      </p>
      {error ? (
        <p className="text-[11px] text-red-700" data-kfz-analytics-export-error="true">
          {error}
        </p>
      ) : null}
    </div>
  )
}
