'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { WorkspaceFrame, WorkspaceSplit } from '@/components/app/workspace'
import { CreateInformationForm } from '@/features/information/components/create-information-form'
import { InformationDetailPanel } from '@/features/information/components/information-detail-panel'
import { InformationEmptyDetail } from '@/features/information/components/information-empty-detail'
import { InformationList } from '@/features/information/components/information-list'
import type { InformationItem } from '@/features/information/types/information-item'
import { aosWorkspaceActionAccentClassName } from '@/lib/design-system'

type InformationWorkspaceProps = {
  items: InformationItem[]
  selectedItemId: string | null
}

export function InformationWorkspace({
  items,
  selectedItemId,
}: InformationWorkspaceProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  )

  const refreshItems = useCallback(() => {
    router.refresh()
  }, [router])

  const navigateToItem = useCallback(
    (itemId: string) => {
      router.push(`/app/information?item=${itemId}`)
    },
    [router]
  )

  const navigateToList = useCallback(() => {
    router.push('/app/information')
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

  const showMobileDetail = isCreating || selectedItem !== null
  const totalCount = items.length
  const countLabel =
    totalCount === 1 ? '1 Information' : `${totalCount} Informationen`

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
            />
          )
        }
        detail={
          isCreating ? (
            <CreateInformationForm
              onCancel={handleCancelCreate}
              onCreated={handleCreated}
            />
          ) : selectedItem ? (
            <InformationDetailPanel
              key={selectedItem.id}
              item={selectedItem}
              onBack={handleBackToList}
              onDeleted={handleDeleted}
            />
          ) : (
            <InformationEmptyDetail />
          )
        }
      />
    </WorkspaceFrame>
  )
}
