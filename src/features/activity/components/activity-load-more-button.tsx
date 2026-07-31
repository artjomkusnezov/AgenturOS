import type { TaskActivityItem } from '@/features/activity/types/task-activity'

type ActivityLoadMoreButtonProps = {
  onClick: () => void
  isLoading: boolean
  disabled: boolean
}

export function ActivityLoadMoreButton({
  onClick,
  isLoading,
  disabled,
}: ActivityLoadMoreButtonProps) {
  return (
    <div className="border-t border-zinc-200/70 pt-4">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="min-h-11 w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 sm:mx-auto sm:max-w-xs"
      >
        {isLoading ? 'Wird geladen …' : 'Mehr laden'}
      </button>
    </div>
  )
}

export function dedupeTaskActivityItems(
  existingItems: TaskActivityItem[],
  nextItems: TaskActivityItem[],
): TaskActivityItem[] {
  const seenIds = new Set(existingItems.map((item) => item.id))
  const mergedItems = [...existingItems]

  for (const item of nextItems) {
    if (seenIds.has(item.id)) {
      continue
    }

    mergedItems.push(item)
    seenIds.add(item.id)
  }

  return mergedItems
}
