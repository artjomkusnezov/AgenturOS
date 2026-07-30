'use client'

import { ContactListItem } from '@/features/contacts/components/contact-list-item'
import type { Contact } from '@/features/contacts/types/contact'

type ContactListProps = {
  contacts: Contact[]
  selectedContactId: string | null
  onSelectContact: (contactId: string) => void
}

export function ContactList({
  contacts,
  selectedContactId,
  onSelectContact,
}: ContactListProps) {
  return (
    <div className="flex flex-col gap-1 overflow-y-auto pr-1">
      {contacts.map((contact) => (
        <ContactListItem
          key={contact.id}
          contact={contact}
          isSelected={contact.id === selectedContactId}
          onSelect={onSelectContact}
        />
      ))}
    </div>
  )
}
