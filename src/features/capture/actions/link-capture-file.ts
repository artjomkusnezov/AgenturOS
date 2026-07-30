'use server'

import { revalidatePath } from 'next/cache'

import {
  linkCaptureFileForCurrentUser,
  rollbackCaptureFileForCurrentUser,
} from '@/features/capture/repositories/capture-repository'
import type { CaptureLinkFileActionResult } from '@/features/capture/types/capture'

export async function linkCaptureFileAction(
  inboxItemId: string,
  fileId: string
): Promise<CaptureLinkFileActionResult> {
  const result = await linkCaptureFileForCurrentUser(inboxItemId, fileId)

  if (!result.success) {
    await rollbackCaptureFileForCurrentUser(fileId)
    return { error: result.error }
  }

  revalidatePath('/app/inbox')
  revalidatePath('/app')
  revalidatePath('/app/files')

  return { success: true }
}
