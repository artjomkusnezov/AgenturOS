'use client'

import { formatContactListLabel, formatContactListSubtitle } from '@/features/contacts/lib/format-contact-label'
import { formatContactDateTime } from '@/features/contacts/lib/contact-status'
import type { Contact } from '@/features/contacts/types/contact'

type ContactListItemProps = {
  contact: Contact
  isSelected: boolean
  onSelect: (contactId: string) => void
}

export function ContactListItem({ contact, isSelected, onSelect }: ContactListItemProps) {
  const subtitle = formatContactListSubtitle(contact)

  return (
    <button
      type="button"
      onClick={() => onSelect(contact.id)}
      aria-current={isSelected ? 'true' : undefined}
      className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        isSelected
          ? 'bg-white shadow-sm ring-1 ring-zinc-200/80'
          : 'hover:bg-white/70'
      }`}
    >
      <p className="truncate text-sm font-medium text-zinc-900">
        {formatContactListLabel(contact)}
      </p>

      {subtitle ? (
        <p className="mt-1 truncate text-xs text-zinc-500">{subtitle}</p>
      ) : null}

      <p className="mt-2 text-xs text-zinc-500">
        Geändert am {formatContactDateTime(contact.updated_at)}
      </p>
    </button>
  )
}
