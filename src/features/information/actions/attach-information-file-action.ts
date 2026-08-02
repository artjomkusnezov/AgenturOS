'use server'

import { revalidatePath } from 'next/cache'

import { attachFileToInformationItem } from '@/features/information/repositories/information-repository'
import type { InformationRelationMutationState } from '@/features/information/types/information-item'

export async function attachInformationFileAction(
  _prevState: InformationRelationMutationState,
  formData: FormData,
): Promise<InformationRelationMutationState> {
  const informationId = String(formData.get('informationId') ?? '')
  const fileId = String(formData.get('fileId') ?? '')

  const result = await attachFileToInformationItem(informationId, fileId)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/information')
  revalidatePath('/app/files')

  return { success: true }
}
