'use client'

import { formatContactListLabel, formatContactListSubtitle } from '@/features/contacts/lib/format-contact-label'
import { formatContactDateTime } from '@/features/contacts/lib/contact-status'
import type { Contact } from '@/features/contacts/types/contact'
import {
  aosListRowClassName,
  aosListRowHoverClassName,
  aosListSelectedClassName,
  aosWsTextMetaClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

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
      className={`${aosListRowClassName} flex-col items-stretch gap-0.5 ${
        isSelected ? aosListSelectedClassName : aosListRowHoverClassName
      } w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      <p className={`truncate text-[13px] font-medium leading-snug ${aosWsTextPrimaryClassName}`}>
        {formatContactListLabel(contact)}
      </p>

      {subtitle ? (
        <p className={`mt-0.5 truncate text-[11px] leading-none ${aosWsTextMetaClassName}`}>{subtitle}</p>
      ) : null}

      <p className={`mt-1 truncate text-[11px] leading-none ${aosWsTextMetaClassName}`}>
        Geändert am {formatContactDateTime(contact.updated_at)}
      </p>
    </button>
  )
}
