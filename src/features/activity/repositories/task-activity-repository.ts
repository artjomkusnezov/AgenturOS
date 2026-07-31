import { mapTaskTimelineEntryToActivity } from '@/features/activity/lib/map-task-activity'
import type { TaskActivityItem } from '@/features/activity/types/task-activity'
import { listCurrentAgencyMembers } from '@/features/agency/repositories/agency-repository'
import { buildMemberNameMap } from '@/features/tasks/lib/resolve-task-member-name'
import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type ListTaskActivityResult =
  | { success: true; items: TaskActivityItem[] }
  | RepositoryError

export const TASK_ACTIVITY_PAGE_SIZE = 30

type TaskTimelineEntryRow = TaskTimelineEntry & {
  tasks: {
    title: string
  }
}

type ListTaskActivityOptions = {
  limit?: number
}

export async function listTaskActivityForCurrentUser(
  options: ListTaskActivityOptions = {},
): Promise<ListTaskActivityResult> {
  const limit = options.limit ?? TASK_ACTIVITY_PAGE_SIZE
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

  const { data, error } = await supabase
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
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)

  if (error) {
    return {
      success: false,
      error: 'Die Aktivitäten konnten nicht geladen werden.',
    }
  }

  const membersResult = await listCurrentAgencyMembers()
  const memberNameMap = membersResult.success
    ? buildMemberNameMap(membersResult.members)
    : {}

  const items = (data as TaskTimelineEntryRow[]).flatMap((entry) => {
    const activity = mapTaskTimelineEntryToActivity(entry, memberNameMap)

    return activity ? [activity] : []
  })

  return {
    success: true,
    items,
  }
}
