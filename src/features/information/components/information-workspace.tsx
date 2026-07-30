'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { CreateInformationForm } from '@/features/information/components/create-information-form'
import { InformationDetailPanel } from '@/features/information/components/information-detail-panel'
import { InformationEmptyDetail } from '@/features/information/components/information-empty-detail'
import { InformationList } from '@/features/information/components/information-list'
import type { InformationItem } from '@/features/information/types/information-item'

type InformationWorkspaceProps = {
  items: InformationItem[]
  initialItemId?: string | null
}

export function InformationWorkspace({
  items,
  initialItemId = null,
}: InformationWorkspaceProps) {
  const router = useRouter()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(() => {
    if (!initialItemId) {
      return null
    }

    return items.some((item) => item.id === initialItemId) ? initialItemId : null
  })
  const [isCreating, setIsCreating] = useState(false)

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  )

  const refreshItems = useCallback(() => {
    router.refresh()
  }, [router])

  const handleSelectItem = useCallback((itemId: string) => {
    setIsCreating(false)
    setSelectedItemId(itemId)
  }, [])

  const handleStartCreate = useCallback(() => {
    setSelectedItemId(null)
    setIsCreating(true)
  }, [])

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false)
  }, [])

  const handleCreated = useCallback(
    (itemId: string) => {
      setIsCreating(false)
      setSelectedItemId(itemId)
      refreshItems()
    },
    [refreshItems]
  )

  const handleBackToList = useCallback(() => {
    setSelectedItemId(null)
    setIsCreating(false)
  }, [])

  const handleDeleted = useCallback(() => {
    setSelectedItemId(null)
    refreshItems()
  }, [refreshItems])

  const showMobileDetail = isCreating || selectedItem !== null
  const totalCount = items.length

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col lg:flex-row lg:gap-6">
      <section
        aria-label="Informationsliste"
        className={`flex w-full flex-col lg:w-80 lg:shrink-0 ${
          showMobileDetail ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              Informationen
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {totalCount === 1 ? '1 Information' : `${totalCount} Informationen`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartCreate}
            className="rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90"
          >
            Neu erstellen
          </button>
        </div>

        {totalCount === 0 ? (
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
        )}
      </section>

      <section
        aria-label="Informationsdetails"
        className={`min-h-[24rem] flex-1 ${
          showMobileDetail ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {isCreating ? (
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
        )}
      </section>
    </div>
  )
}
