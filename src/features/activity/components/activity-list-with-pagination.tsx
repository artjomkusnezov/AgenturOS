'use client'

import { useCallback, useState } from 'react'

import { loadMoreActivityAction } from '@/features/activity/actions/load-more-activity-action'
import { ActivityList } from '@/features/activity/components/activity-list'
import {
  ActivityLoadMoreButton,
  dedupeTaskActivityItems,
} from '@/features/activity/components/activity-load-more-button'
import type {
  TaskActivityCursor,
  TaskActivityItem,
} from '@/features/activity/types/task-activity'
import { aosAlertErrorClassName } from '@/lib/design-system'

type ActivityListWithPaginationProps = {
  initialItems: TaskActivityItem[]
  initialHasMore: boolean
  initialNextCursor: TaskActivityCursor | null
}

export function ActivityListWithPagination({
  initialItems,
  initialHasMore,
  initialNextCursor,
}: ActivityListWithPaginationProps) {
  const [items, setItems] = useState(initialItems)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoading) {
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await loadMoreActivityAction(nextCursor)

    if (!result.success) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    setItems((currentItems) => dedupeTaskActivityItems(currentItems, result.items))
    setHasMore(result.hasMore)
    setNextCursor(result.nextCursor)
    setIsLoading(false)
  }, [isLoading, nextCursor])

  return (
    <>
      <ActivityList items={items} />

      {error ? (
        <div className={`mt-4 ${aosAlertErrorClassName}`} role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoading || !nextCursor}
            className="mt-2 min-h-11 text-sm font-medium text-red-800 underline underline-offset-2 transition-colors duration-150 hover:text-red-900 disabled:opacity-60"
          >
            Erneut versuchen
          </button>
        </div>
      ) : null}

      {hasMore ? (
        <ActivityLoadMoreButton
          onClick={handleLoadMore}
          isLoading={isLoading}
          disabled={isLoading || !nextCursor}
        />
      ) : null}
    </>
  )
}
