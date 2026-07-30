'use server'

import { revalidatePath } from 'next/cache'

import { updateContactForCurrentUser } from '@/features/contacts/repositories/contacts-repository'
import {
  hasContactFieldErrors,
  isValidContactId,
  normalizeContactInput,
  parseContactFormData,
  validateContactInput,
} from '@/features/contacts/lib/validate-contact'
import type { ContactMutationState } from '@/features/contacts/types/contact'

export async function updateContactAction(
  _prevState: ContactMutationState,
  formData: FormData
): Promise<ContactMutationState> {
  const contactId = String(formData.get('contactId') ?? '')

  if (!isValidContactId(contactId)) {
    return { error: 'Der Kontakt ist ungültig.' }
  }

  const input = parseContactFormData(formData)
  const fieldErrors = validateContactInput(input)

  if (hasContactFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await updateContactForCurrentUser(contactId, normalizeContactInput(input))

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/contacts')

  return {
    success: true,
    contactId: result.contact.id,
  }
}
