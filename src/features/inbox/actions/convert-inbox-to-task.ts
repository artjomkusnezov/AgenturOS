'use server'

import { revalidatePath } from 'next/cache'

import { createTaskFromInboxItem } from '@/features/inbox/repositories/inbox-repository'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'

export async function convertInboxToTaskAction(
  _prevState: InboxItemMutationState,
  formData: FormData
): Promise<InboxItemMutationState> {
  const itemId = String(formData.get('itemId') ?? '')

  if (!isValidInboxItemId(itemId)) {
    return { error: 'Das Eingangselement ist ungültig.' }
  }

  const result = await createTaskFromInboxItem(itemId)

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
