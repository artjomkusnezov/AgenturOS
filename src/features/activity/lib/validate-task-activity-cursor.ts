import { isValidTaskId } from '@/features/tasks/lib/validate-task'
import type { TaskActivityCursor } from '@/features/activity/types/task-activity'

export function validateTaskActivityCursor(cursor: TaskActivityCursor): string | null {
  if (!cursor.createdAt.trim() || Number.isNaN(Date.parse(cursor.createdAt))) {
    return 'Ungültiger Cursor.'
  }

  if (!isValidTaskId(cursor.id)) {
    return 'Ungültiger Cursor.'
  }

  return null
}
