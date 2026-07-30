'use server'

import { revalidatePath } from 'next/cache'

import { deleteCaptureInboxForCurrentUser } from '@/features/capture/repositories/capture-repository'
import type { CaptureDeleteInboxActionResult } from '@/features/capture/types/capture'

export async function deleteCaptureInboxAction(
  inboxItemId: string
): Promise<CaptureDeleteInboxActionResult> {
  const result = await deleteCaptureInboxForCurrentUser(inboxItemId)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/inbox')
  revalidatePath('/app')

  return { success: true }
}
