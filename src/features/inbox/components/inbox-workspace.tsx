'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { CreateInboxItemForm } from '@/features/inbox/components/create-inbox-item-form'
import { InboxDetailPanel } from '@/features/inbox/components/inbox-detail-panel'
import { InboxEmptyDetail } from '@/features/inbox/components/inbox-empty-detail'
import { InboxList } from '@/features/inbox/components/inbox-list'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

type InboxWorkspaceProps = {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
}

export function InboxWorkspace({ unprocessedItems, processedItems }: InboxWorkspaceProps) {
  const router = useRouter()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
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

  const handleStatusChange = useCallback(() => {
    refreshItems()
  }, [refreshItems])

  const showMobileDetail = isCreating || selectedItem !== null
  const totalCount = items.length

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col lg:flex-row lg:gap-6">
      <section
        aria-label="Eingangsliste"
        className={`flex w-full flex-col lg:w-80 lg:shrink-0 ${
          showMobileDetail ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              Eingang
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {totalCount === 1 ? '1 Element' : `${totalCount} Elemente`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartCreate}
            className="rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90"
          >
            Neu erfassen
          </button>
        </div>

        {totalCount === 0 ? (
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
        )}
      </section>

      <section
        aria-label="Eingangsdetails"
        className={`min-h-[24rem] flex-1 ${
          showMobileDetail ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {isCreating ? (
          <CreateInboxItemForm
            onCancel={handleCancelCreate}
            onCreated={handleCreated}
          />
        ) : selectedItem ? (
          <InboxDetailPanel
            key={selectedItem.id}
            item={selectedItem}
            onBack={handleBackToList}
            onDeleted={handleDeleted}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <InboxEmptyDetail />
        )}
      </section>
    </div>
  )
}
