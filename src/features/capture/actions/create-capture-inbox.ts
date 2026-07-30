'use server'

import { revalidatePath } from 'next/cache'

import { createCaptureInboxForCurrentUser } from '@/features/capture/repositories/capture-repository'
import type { CaptureInboxActionResult } from '@/features/capture/types/capture'

export async function createCaptureInboxAction(
  content: string,
  filenames: string[]
): Promise<CaptureInboxActionResult> {
  const result = await createCaptureInboxForCurrentUser({ content, filenames })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/inbox')
  revalidatePath('/app')

  return {
    success: true,
    itemId: result.itemId,
  }
}
