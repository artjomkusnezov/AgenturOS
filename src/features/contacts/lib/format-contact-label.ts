import type { Contact } from '@/features/contacts/types/contact'

export function formatContactListLabel(contact: Contact): string {
  const firstName = contact.first_name?.trim() ?? ''
  const lastName = contact.last_name?.trim() ?? ''
  const company = contact.company?.trim() ?? ''

  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }

  if (firstName) {
    return firstName
  }

  if (lastName) {
    return lastName
  }

  return company
}

export function formatContactListSubtitle(contact: Contact): string | null {
  const firstName = contact.first_name?.trim() ?? ''
  const lastName = contact.last_name?.trim() ?? ''
  const company = contact.company?.trim() ?? ''
  const email = contact.email?.trim() ?? ''
  const phone = contact.phone?.trim() ?? ''

  const hasName = Boolean(firstName || lastName)

  if (hasName && company) {
    return company
  }

  if (email) {
    return email
  }

  if (phone) {
    return phone
  }

  return null
}
