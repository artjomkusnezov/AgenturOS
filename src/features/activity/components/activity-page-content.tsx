import { EmptyState } from '@/components/app/empty-state'
import { ActivityListWithPagination } from '@/features/activity/components/activity-list-with-pagination'
import { listTaskActivityForCurrentUser } from '@/features/activity/repositories/task-activity-repository'
import { aosAlertErrorClassName } from '@/lib/design-system'

export async function ActivityPageContent() {
  const result = await listTaskActivityForCurrentUser()

  if (!result.success) {
    return (
      <div className={`${aosAlertErrorClassName} px-5 py-4`} role="alert">
        {result.error}
      </div>
    )
  }

  if (result.items.length === 0) {
    return (
      <div className="aos-ws-empty-detail">
        <EmptyState
          title="Noch keine gemeinsamen Aktivitäten"
          description="Sobald in gemeinsamen Vorgängen relevante Änderungen entstehen, erscheinen sie hier."
        />
      </div>
    )
  }

  return (
    <div className="aos-activity-surface">
      <ActivityListWithPagination
        initialItems={result.items}
        initialHasMore={result.hasMore}
        initialNextCursor={result.nextCursor}
      />
    </div>
  )
}
