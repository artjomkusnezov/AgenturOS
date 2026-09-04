'use client'

import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { WorkspaceFrame, WorkspaceSplit } from '@/components/app/workspace'
import { InboxDetailPanel } from '@/features/inbox/components/inbox-detail-panel'
import { InboxEmptyDetail } from '@/features/inbox/components/inbox-empty-detail'
import { InboxList } from '@/features/inbox/components/inbox-list'
import type { InboxItem, InboxLinkedFile } from '@/features/inbox/types/inbox-item'

type InboxWorkspaceProps = {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  taskRelationsByItemId: Record<string, string>
  selectedItemId: string | null
  attachments?: InboxLinkedFile[]
  memberNameMap?: Record<string, string>
}

export function InboxWorkspace({
  unprocessedItems,
  processedItems,
  taskRelationsByItemId,
  selectedItemId,
  attachments = [],
  memberNameMap = {},
}: InboxWorkspaceProps) {
  const router = useRouter()
  const items = useMemo(
    () => [...unprocessedItems, ...processedItems],
    [unprocessedItems, processedItems]
  )

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  )

  const refreshItems = useCallback(() => {
    router.refresh()
  }, [router])

  const navigateToItem = useCallback(
    (itemId: string) => {
      router.push(`/app/inbox?item=${itemId}`)
    },
    [router]
  )

  const navigateToList = useCallback(() => {
    router.push('/app/inbox')
  }, [router])

  const handleSelectItem = useCallback(
    (itemId: string) => {
      navigateToItem(itemId)
    },
    [navigateToItem]
  )

  const handleBackToList = useCallback(() => {
    navigateToList()
  }, [navigateToList])

  const handleDeleted = useCallback(() => {
    navigateToList()
    refreshItems()
  }, [navigateToList, refreshItems])

  const handleStatusChange = useCallback(() => {
    refreshItems()
  }, [refreshItems])

  const showMobileDetail = selectedItem !== null
  const totalCount = items.length
  const countLabel = totalCount === 1 ? '1 Element' : `${totalCount} Elemente`

  return (
    <WorkspaceFrame compact meta={countLabel}>
      <WorkspaceSplit
        listLabel="Eingangsliste"
        detailLabel="Eingangsdetails"
        showMobileDetail={showMobileDetail}
        list={
          totalCount === 0 ? (
            <EmptyState
              title="Noch nichts erfasst"
              description="Erfassen Sie Inhalt für den zentralen Eingang. Sie entscheiden später, wofür er verwendet wird."
            />
          ) : (
            <InboxList
              unprocessedItems={unprocessedItems}
              processedItems={processedItems}
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
              memberNameMap={memberNameMap}
            />
          )
        }
        detail={
          selectedItem ? (
            <InboxDetailPanel
              key={selectedItem.id}
              item={selectedItem}
              linkedTaskId={taskRelationsByItemId[selectedItem.id] ?? null}
              attachments={attachments}
              memberNameMap={memberNameMap}
              onBack={handleBackToList}
              onDeleted={handleDeleted}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <InboxEmptyDetail />
          )
        }
      />
    </WorkspaceFrame>
  )
}
