'use server'

import { validateTaskActivityCursor } from '@/features/activity/lib/validate-task-activity-cursor'
import { listTaskActivityForCurrentUser } from '@/features/activity/repositories/task-activity-repository'
import type {
  LoadMoreActivityResult,
  TaskActivityCursor,
} from '@/features/activity/types/task-activity'

export async function loadMoreActivityAction(
  cursor: TaskActivityCursor,
): Promise<LoadMoreActivityResult> {
  const validationError = validateTaskActivityCursor(cursor)

  if (validationError) {
    return {
      success: false,
      error: 'Weitere Aktivitäten konnten nicht geladen werden.',
    }
  }

  const result = await listTaskActivityForCurrentUser({ cursor })

  if (!result.success) {
    return {
      success: false,
      error: 'Weitere Aktivitäten konnten nicht geladen werden.',
    }
  }

  return {
    success: true,
    items: result.items,
    hasMore: result.hasMore,
    nextCursor: result.nextCursor,
  }
}
