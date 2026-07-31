import { EmptyState } from '@/components/app/empty-state'
import { ActivityList } from '@/features/activity/components/activity-list'
import { listTaskActivityForCurrentUser } from '@/features/activity/repositories/task-activity-repository'

export async function ActivityPageContent() {
  const result = await listTaskActivityForCurrentUser()

  if (!result.success) {
    return (
      <div
        className="rounded-xl border border-red-200/80 bg-red-50 px-5 py-4 text-sm text-red-700"
        role="alert"
      >
        {result.error}
      </div>
    )
  }

  if (result.items.length === 0) {
    return (
      <EmptyState
        title="Noch keine gemeinsamen Aktivitäten"
        description="Sobald in gemeinsamen Vorgängen relevante Änderungen entstehen, erscheinen sie hier."
      />
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200/60 bg-white px-4 py-4 sm:px-5">
      <ActivityList items={result.items} />
    </div>
  )
}
