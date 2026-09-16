'use client'

import { useMemo, useSyncExternalStore } from 'react'

import { KFZ_DOCUMENT_REVIEW_PATH } from '@/features/inbound/kfz/types/kfz-document-storage'
import { LeadsWorkspace } from '@/features/leads/components/leads-workspace'
import {
  applyPreviewLeadStatus,
  KFZ_LEADS_PREVIEW_PATH,
  splitPreviewLeadItems,
} from '@/features/leads/lib/kfz-leads-preview'
import {
  readKfzLeadsPreviewItems,
  readKfzLeadsPreviewServerSnapshot,
  subscribeKfzLeadsPreview,
  writeKfzLeadsPreviewItems,
} from '@/features/leads/lib/kfz-leads-preview-store'
import { presentKfzLeadsWorkspace } from '@/features/leads/lib/present-kfz-leads'

type LeadsPreviewAppProps = {
  selectedItemId: string | null
  status?: string | null
}

export function LeadsPreviewApp({ selectedItemId, status }: LeadsPreviewAppProps) {
  const items = useSyncExternalStore(
    subscribeKfzLeadsPreview,
    readKfzLeadsPreviewItems,
    readKfzLeadsPreviewServerSnapshot,
  )
  const split = useMemo(() => splitPreviewLeadItems(items), [items])
  const view = useMemo(
    () =>
      presentKfzLeadsWorkspace({
        unprocessedItems: split.unprocessedItems,
        processedItems: split.processedItems,
        selectedItemId,
        status,
        basePath: KFZ_LEADS_PREVIEW_PATH,
        documentReviewBasePath: KFZ_DOCUMENT_REVIEW_PATH,
        inboxHrefBase: '/dev/inbox',
        usesPreviewFixtures: true,
      }),
    [selectedItemId, split.processedItems, split.unprocessedItems, status],
  )

  const emptyTitle = view.totalCount === 0 ? 'Keine Kfz-Leads' : 'Keine Leads in diesem Filter'
  const emptyDescription =
    view.totalCount === 0
      ? 'In der lokalen Vorschau liegt kein synthetischer Lead vor.'
      : 'Dieser Statusfilter ist leer.'

  return (
    <LeadsWorkspace
      rows={view.rows}
      items={view.items}
      selectedItemId={view.selectedItemId}
      selectedDetail={view.selectedDetail}
      statusFilter={view.statusFilter}
      filterHrefs={view.filterHrefs}
      metaLabel={view.metaLabel}
      hrefBasePath={view.hrefBasePath}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      onLocalApply={(itemId, nextStatus) => {
        writeKfzLeadsPreviewItems(applyPreviewLeadStatus(items, itemId, nextStatus))
      }}
    />
  )
}
