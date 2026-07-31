import { groupTaskActivityItems } from '@/features/activity/lib/format-activity-date'
import { ActivityListItem } from '@/features/activity/components/activity-list-item'
import type { TaskActivityItem } from '@/features/activity/types/task-activity'

type ActivityListProps = {
  items: TaskActivityItem[]
}

export function ActivityList({ items }: ActivityListProps) {
  const groups = groupTaskActivityItems(items)

  return (
    <div className="divide-y divide-zinc-200/70">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label} className="py-3.5 first:pt-0 last:pb-0">
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {group.label}
          </h2>
          <div>
            {group.items.map((item) => (
              <ActivityListItem key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
