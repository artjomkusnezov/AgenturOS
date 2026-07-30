'use server'

import { revalidatePath } from 'next/cache'

import { createContactForCurrentUser } from '@/features/contacts/repositories/contacts-repository'
import {
  hasContactFieldErrors,
  normalizeContactInput,
  parseContactFormData,
  validateContactInput,
} from '@/features/contacts/lib/validate-contact'
import type { ContactMutationState } from '@/features/contacts/types/contact'

export async function createContactAction(
  _prevState: ContactMutationState,
  formData: FormData
): Promise<ContactMutationState> {
  const input = parseContactFormData(formData)
  const fieldErrors = validateContactInput(input)

  if (hasContactFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await createContactForCurrentUser(normalizeContactInput(input))

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/contacts')

  return {
    success: true,
    contactId: result.contact.id,
  }
}
