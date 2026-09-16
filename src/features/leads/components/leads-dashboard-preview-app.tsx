'use client'

import { useMemo, useSyncExternalStore } from 'react'

import { AgenturzentraleDashboard } from '@/features/dashboard/components/agenturzentrale-dashboard'
import {
  KFZ_LEADS_PREVIEW_PATH,
  splitPreviewLeadItems,
} from '@/features/leads/lib/kfz-leads-preview'
import {
  readKfzLeadsPreviewItems,
  readKfzLeadsPreviewServerSnapshot,
  subscribeKfzLeadsPreview,
} from '@/features/leads/lib/kfz-leads-preview-store'
import { countOpenKfzLeads } from '@/features/leads/lib/kfz-lead-status'
import { countKfzWorkQueue } from '@/features/inbox/lib/kfz-work-queue'

export function LeadsDashboardPreviewApp() {
  const items = useSyncExternalStore(
    subscribeKfzLeadsPreview,
    readKfzLeadsPreviewItems,
    readKfzLeadsPreviewServerSnapshot,
  )
  const split = useMemo(() => splitPreviewLeadItems(items), [items])
  const openLeadsCount = countOpenKfzLeads(items)
  const kfzQueueCounts = countKfzWorkQueue(items, {})

  return (
    <AgenturzentraleDashboard
      user={{ user_metadata: { full_name: 'Vorschau' } }}
      unprocessedInboxItems={split.unprocessedItems}
      kfzQueueCounts={kfzQueueCounts}
      attentionItems={[]}
      attentionCount={0}
      myTasks={[]}
      myOpenTaskCount={0}
      teamTasks={{
        members: [],
        unassigned: { openCount: 0, overdueCount: 0, previewTasks: [] },
        totalTeamOpenCount: 0,
      }}
      activeCaseCount={0}
      caseTypeCounts={[]}
      recentlyUpdated={[]}
      openLeadsCount={openLeadsCount}
      leadsHref={KFZ_LEADS_PREVIEW_PATH}
    />
  )
}
