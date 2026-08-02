'use server'

import { revalidatePath } from 'next/cache'

import { promoteInboxItem } from '@/features/cases/services/inbox-promotion-service'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'

/**
 * UI-Pfad „Als Aufgabe übernehmen“.
 * Intern: gemeinsame Promotion mit case_type = task.
 */
export async function convertInboxToTaskAction(
  _prevState: InboxItemMutationState,
  formData: FormData
): Promise<InboxItemMutationState> {
  const itemId = String(formData.get('itemId') ?? '')

  if (!isValidInboxItemId(itemId)) {
    return { error: 'Das Eingangselement ist ungültig.' }
  }

  const result = await promoteInboxItem({
    inboxItemId: itemId,
    target: { kind: 'case', caseType: 'task' },
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/inbox')
  revalidatePath('/app/tasks')

  return {
    success: true,
    itemId: result.inboxItemId,
    taskId: result.taskId,
  }
}
