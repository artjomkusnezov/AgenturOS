import type { Contact } from '@/features/contacts/types/contact'

export function sortContacts(contacts: Contact[]): Contact[] {
  return [...contacts].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
}
