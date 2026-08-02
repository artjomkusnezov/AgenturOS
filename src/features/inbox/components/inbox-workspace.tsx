'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { WorkspaceFrame, WorkspaceSplit } from '@/components/app/workspace'
import { CreateInboxItemForm } from '@/features/inbox/components/create-inbox-item-form'
import { InboxDetailPanel } from '@/features/inbox/components/inbox-detail-panel'
import { InboxEmptyDetail } from '@/features/inbox/components/inbox-empty-detail'
import { InboxList } from '@/features/inbox/components/inbox-list'
import type { InboxItem, InboxLinkedFile } from '@/features/inbox/types/inbox-item'
import { aosWorkspaceActionAccentClassName } from '@/lib/design-system'

type InboxWorkspaceProps = {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  taskRelationsByItemId: Record<string, string>
  selectedItemId: string | null
  attachments?: InboxLinkedFile[]
}

export function InboxWorkspace({
  unprocessedItems,
  processedItems,
  taskRelationsByItemId,
  selectedItemId,
  attachments = [],
}: InboxWorkspaceProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

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
      setIsCreating(false)
      navigateToItem(itemId)
    },
    [navigateToItem]
  )

  const handleStartCreate = useCallback(() => {
    setIsCreating(true)
    navigateToList()
  }, [navigateToList])

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false)
  }, [])

  const handleCreated = useCallback(
    (itemId: string) => {
      setIsCreating(false)
      navigateToItem(itemId)
      refreshItems()
    },
    [navigateToItem, refreshItems]
  )

  const handleBackToList = useCallback(() => {
    setIsCreating(false)
    navigateToList()
  }, [navigateToList])

  const handleDeleted = useCallback(() => {
    navigateToList()
    refreshItems()
  }, [navigateToList, refreshItems])

  const handleStatusChange = useCallback(() => {
    refreshItems()
  }, [refreshItems])

  const showMobileDetail = isCreating || selectedItem !== null
  const totalCount = items.length
  const countLabel = totalCount === 1 ? '1 Element' : `${totalCount} Elemente`

  return (
    <WorkspaceFrame
      compact
      meta={countLabel}
      primary={
        <button type="button" onClick={handleStartCreate} className={aosWorkspaceActionAccentClassName}>
          Neu
        </button>
      }
    >
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
            />
          )
        }
        detail={
          isCreating ? (
            <CreateInboxItemForm
              onCancel={handleCancelCreate}
              onCreated={handleCreated}
            />
          ) : selectedItem ? (
            <InboxDetailPanel
              key={selectedItem.id}
              item={selectedItem}
              linkedTaskId={taskRelationsByItemId[selectedItem.id] ?? null}
              attachments={attachments}
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
