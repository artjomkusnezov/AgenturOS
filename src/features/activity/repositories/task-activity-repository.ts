import { mapTaskTimelineEntryToActivity } from '@/features/activity/lib/map-task-activity'
import { buildVisibleActivityFeedOrFilter } from '@/features/activity/lib/task-activity-events'
import type {
  TaskActivityCursor,
  TaskActivityItem,
  TaskActivityPage,
} from '@/features/activity/types/task-activity'
import { listCurrentAgencyMembers } from '@/features/agency/repositories/agency-repository'
import { buildMemberNameMap } from '@/features/tasks/lib/resolve-task-member-name'
import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type ListTaskActivityResult =
  | ({ success: true } & TaskActivityPage)
  | RepositoryError

export const TASK_ACTIVITY_PAGE_SIZE = 30

type TaskTimelineEntryRow = TaskTimelineEntry & {
  tasks: {
    title: string
  }
}

type ListTaskActivityOptions = {
  limit?: number
  cursor?: TaskActivityCursor | null
}

function buildActivityKeysetOrFilter(cursor: TaskActivityCursor): string {
  const createdAt = cursor.createdAt.replace(/"/g, '\\"')

  return `created_at.lt."${createdAt}",and(created_at.eq."${createdAt}",id.lt.${cursor.id})`
}

function mapRowsToActivityItems(
  rows: TaskTimelineEntryRow[],
  memberNameMap: Record<string, string>,
): TaskActivityItem[] {
  return rows.flatMap((entry) => {
    const activity = mapTaskTimelineEntryToActivity(entry, memberNameMap)

    return activity ? [activity] : []
  })
}

export async function listTaskActivityForCurrentUser(
  options: ListTaskActivityOptions = {},
): Promise<ListTaskActivityResult> {
  const pageSize = options.limit ?? TASK_ACTIVITY_PAGE_SIZE
  const fetchLimit = pageSize + 1
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'Sie sind nicht angemeldet.',
    }
  }

  let query = supabase
    .from('task_timeline_entries')
    .select(
      `
        id,
        task_id,
        entry_type,
        event_key,
        author_user_id,
        content,
        created_at,
        tasks!inner (
          title
        )
      `,
    )
    .or(buildVisibleActivityFeedOrFilter())

  if (options.cursor) {
    query = query.or(buildActivityKeysetOrFilter(options.cursor))
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(fetchLimit)

  if (error) {
    return {
      success: false,
      error: 'Die Aktivitäten konnten nicht geladen werden.',
    }
  }

  const rows = (data ?? []) as TaskTimelineEntryRow[]
  const membersResult = await listCurrentAgencyMembers()
  const memberNameMap = membersResult.success
    ? buildMemberNameMap(membersResult.members)
    : {}

  const hasMore = rows.length > pageSize
  const pageRows = rows.slice(0, pageSize)
  const items = mapRowsToActivityItems(pageRows, memberNameMap)
  const lastRow = pageRows.at(-1)

  return {
    success: true,
    items,
    hasMore,
    nextCursor:
      hasMore && lastRow
        ? {
            createdAt: lastRow.created_at,
            id: lastRow.id,
          }
        : null,
  }
}
