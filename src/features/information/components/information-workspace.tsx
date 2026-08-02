'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { WorkspaceFrame, WorkspaceSplit } from '@/components/app/workspace'
import { CreateInformationForm } from '@/features/information/components/create-information-form'
import { InformationDetailPanel } from '@/features/information/components/information-detail-panel'
import { InformationEmptyDetail } from '@/features/information/components/information-empty-detail'
import { InformationList } from '@/features/information/components/information-list'
import type {
  InformationItem,
  InformationLinkedFile,
} from '@/features/information/types/information-item'
import {
  aosAlertWarningClassName,
  aosWorkspaceActionAccentClassName,
} from '@/lib/design-system'

type InformationWorkspaceProps = {
  items: InformationItem[]
  selectedItemId: string | null
  attachments?: InformationLinkedFile[]
  attachmentNotice?: string | null
  memberNameMap?: Record<string, string>
}

export function InformationWorkspace({
  items,
  selectedItemId,
  attachments = [],
  attachmentNotice = null,
  memberNameMap = {},
}: InformationWorkspaceProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [dismissedNoticeForItemId, setDismissedNoticeForItemId] = useState<string | null>(null)

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  )

  const captureNotice =
    attachmentNotice && dismissedNoticeForItemId !== selectedItemId ? attachmentNotice : null

  const refreshItems = useCallback(() => {
    router.refresh()
  }, [router])

  const navigateToItem = useCallback(
    (itemId: string) => {
      router.push(`/app/information?item=${itemId}`)
    },
    [router],
  )

  const navigateToList = useCallback(() => {
    router.push('/app/information')
  }, [router])

  const handleDismissCaptureNotice = useCallback(() => {
    if (selectedItemId) {
      setDismissedNoticeForItemId(selectedItemId)
      router.replace(`/app/information?item=${selectedItemId}`)
    }
  }, [router, selectedItemId])

  const handleSelectItem = useCallback(
    (itemId: string) => {
      setIsCreating(false)
      navigateToItem(itemId)
    },
    [navigateToItem],
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
    [navigateToItem, refreshItems],
  )

  const handleBackToList = useCallback(() => {
    setIsCreating(false)
    navigateToList()
  }, [navigateToList])

  const handleDeleted = useCallback(() => {
    navigateToList()
    refreshItems()
  }, [navigateToList, refreshItems])

  const showMobileDetail = isCreating || selectedItem !== null
  const totalCount = items.length
  const countLabel = totalCount === 1 ? '1 Information' : `${totalCount} Informationen`

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
        listLabel="Informationsliste"
        detailLabel="Informationsdetails"
        showMobileDetail={showMobileDetail}
        list={
          totalCount === 0 ? (
            <EmptyState
              title="Noch keine Informationen"
              description="Erstellen Sie dauerhaftes Wissen wie Prozesse, Leitfäden oder Notizen."
            />
          ) : (
            <InformationList
              items={items}
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
              memberNameMap={memberNameMap}
            />
          )
        }
        detail={
          <>
            {captureNotice ? (
              <div role="status" className={`mb-3 ${aosAlertWarningClassName}`}>
                <div className="flex items-start justify-between gap-3">
                  <p>{captureNotice}</p>
                  <button
                    type="button"
                    onClick={handleDismissCaptureNotice}
                    className="shrink-0 text-xs font-medium text-amber-800 transition-colors duration-150 hover:text-amber-950"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            ) : null}
            <div className="flex min-h-0 w-full flex-1 flex-col">
              {isCreating ? (
                <CreateInformationForm
                  onCancel={handleCancelCreate}
                  onCreated={handleCreated}
                />
              ) : selectedItem ? (
                <InformationDetailPanel
                  key={selectedItem.id}
                  item={selectedItem}
                  attachments={attachments}
                  memberNameMap={memberNameMap}
                  onBack={handleBackToList}
                  onDeleted={handleDeleted}
                />
              ) : (
                <InformationEmptyDetail />
              )}
            </div>
          </>
        }
      />
    </WorkspaceFrame>
  )
}
