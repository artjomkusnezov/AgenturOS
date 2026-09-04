'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { WorkspaceFrame, WorkspaceSplit } from '@/components/app/workspace'
import { ContactDetailPanel } from '@/features/contacts/components/contact-detail-panel'
import { ContactEmptyDetail } from '@/features/contacts/components/contact-empty-detail'
import { ContactList } from '@/features/contacts/components/contact-list'
import { CreateContactForm } from '@/features/contacts/components/create-contact-form'
import type { Contact } from '@/features/contacts/types/contact'
import { aosWorkspaceActionAccentClassName } from '@/lib/design-system'

type ContactsWorkspaceProps = {
  contacts: Contact[]
  initialContactId?: string | null
}

export function ContactsWorkspace({
  contacts,
  initialContactId = null,
}: ContactsWorkspaceProps) {
  const router = useRouter()
  const [selectedContactId, setSelectedContactId] = useState<string | null>(() => {
    if (!initialContactId) {
      return null
    }

    return contacts.some((contact) => contact.id === initialContactId)
      ? initialContactId
      : null
  })
  const [isCreating, setIsCreating] = useState(false)

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  )

  const refreshContacts = useCallback(() => {
    router.refresh()
  }, [router])

  const handleSelectContact = useCallback((contactId: string) => {
    setIsCreating(false)
    setSelectedContactId(contactId)
  }, [])

  const handleStartCreate = useCallback(() => {
    setSelectedContactId(null)
    setIsCreating(true)
  }, [])

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false)
  }, [])

  const handleCreated = useCallback(
    (contactId: string) => {
      setIsCreating(false)
      setSelectedContactId(contactId)
      refreshContacts()
    },
    [refreshContacts]
  )

  const handleBackToList = useCallback(() => {
    setSelectedContactId(null)
    setIsCreating(false)
  }, [])

  const handleDeleted = useCallback(() => {
    setSelectedContactId(null)
    refreshContacts()
  }, [refreshContacts])

  const showMobileDetail = isCreating || selectedContact !== null
  const totalCount = contacts.length
  const countLabel = totalCount === 1 ? '1 Kontakt' : `${totalCount} Kontakte`

  return (
    <WorkspaceFrame
      compact
      meta={countLabel}
      primary={
        <button type="button" onClick={handleStartCreate} className={aosWorkspaceActionAccentClassName}>
          Neu
        </button>
      }
    >
      <WorkspaceSplit
        listLabel="Kontaktliste"
        detailLabel="Kontaktdetails"
        showMobileDetail={showMobileDetail}
        list={
          totalCount === 0 ? (
            <EmptyState
              title="Noch keine Kontakte"
              description="Legen Sie Personen und Firmen an, die Sie später wiederfinden möchten."
            />
          ) : (
            <ContactList
              contacts={contacts}
              selectedContactId={selectedContactId}
              onSelectContact={handleSelectContact}
            />
          )
        }
        detail={
          isCreating ? (
            <CreateContactForm onCancel={handleCancelCreate} onCreated={handleCreated} />
          ) : selectedContact ? (
            <ContactDetailPanel
              key={selectedContact.id}
              contact={selectedContact}
              onBack={handleBackToList}
              onDeleted={handleDeleted}
            />
          ) : (
            <ContactEmptyDetail />
          )
        }
      />
    </WorkspaceFrame>
  )
}
