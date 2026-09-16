'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { WorkspaceFrame, WorkspaceSplit } from '@/components/app/workspace'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { LeadDetailPanel } from '@/features/leads/components/lead-detail-panel'
import { LeadsList } from '@/features/leads/components/leads-list'
import type { KfzLeadStatus } from '@/features/leads/lib/kfz-lead-status'
import {
  buildKfzLeadHref,
  type KfzLeadDetail,
  type KfzLeadRow,
  type KfzLeadStatusFilter,
} from '@/features/leads/lib/present-kfz-leads'

type LeadsWorkspaceProps = {
  rows: KfzLeadRow[]
  items: InboxItem[]
  selectedItemId: string | null
  selectedDetail: KfzLeadDetail | null
  statusFilter: KfzLeadStatusFilter
  filterHrefs: Record<KfzLeadStatusFilter, string>
  metaLabel: string
  hrefBasePath: string
  emptyTitle: string
  emptyDescription: string
  onLocalApply?: (itemId: string, status: KfzLeadStatus) => void
}

export function LeadsWorkspace({
  rows,
  items,
  selectedItemId,
  selectedDetail,
  statusFilter,
  filterHrefs,
  metaLabel,
  hrefBasePath,
  emptyTitle,
  emptyDescription,
  onLocalApply,
}: LeadsWorkspaceProps) {
  const router = useRouter()
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null

  const navigateToItem = useCallback(
    (itemId: string | null) => {
      router.push(
        buildKfzLeadHref({
          itemId,
          status: statusFilter,
          basePath: hrefBasePath,
        }),
      )
    },
    [hrefBasePath, router, statusFilter],
  )

  const handleStatusChange = useCallback(() => {
    if (!onLocalApply) {
      router.refresh()
    }
  }, [onLocalApply, router])

  return (
    <WorkspaceFrame compact title="Leads" description="Kfz-Anfragen qualifizieren und bearbeiten." meta={metaLabel}>
      <WorkspaceSplit
        listLabel="Leadliste"
        detailLabel="Leaddetails"
        showMobileDetail={selectedItem !== null && selectedDetail !== null}
        list={
          rows.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <EmptyState title={emptyTitle} description={emptyDescription} />
            </div>
          ) : (
            <LeadsList
              rows={rows}
              selectedItemId={selectedItemId}
              statusFilter={statusFilter}
              filterHrefs={filterHrefs}
              onSelectItem={navigateToItem}
            />
          )
        }
        detail={
          selectedItem && selectedDetail ? (
            <LeadDetailPanel
              item={selectedItem}
              detail={selectedDetail}
              onBack={() => navigateToItem(null)}
              onStatusChange={handleStatusChange}
              onLocalApply={
                onLocalApply ? (status) => onLocalApply(selectedItem.id, status) : undefined
              }
            />
          ) : (
            <EmptyState
              title="Kein Lead ausgewählt"
              description="Wähle links eine Kfz-Anfrage, um Kontakt, Fahrzeug und Quelle zu prüfen."
            />
          )
        }
      />
    </WorkspaceFrame>
  )
}
