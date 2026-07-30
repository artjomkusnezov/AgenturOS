'use server'

import { revalidatePath } from 'next/cache'

import { deleteContactForCurrentUser } from '@/features/contacts/repositories/contacts-repository'
import { isValidContactId } from '@/features/contacts/lib/validate-contact'
import type { ContactMutationState } from '@/features/contacts/types/contact'

export async function deleteContactAction(
  _prevState: ContactMutationState,
  formData: FormData
): Promise<ContactMutationState> {
  const contactId = String(formData.get('contactId') ?? '')

  if (!isValidContactId(contactId)) {
    return { error: 'Der Kontakt ist ungültig.' }
  }

  const result = await deleteContactForCurrentUser(contactId)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/contacts')

  return {
    success: true,
  }
}
