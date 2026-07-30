'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { ContactDetailPanel } from '@/features/contacts/components/contact-detail-panel'
import { ContactEmptyDetail } from '@/features/contacts/components/contact-empty-detail'
import { ContactList } from '@/features/contacts/components/contact-list'
import { CreateContactForm } from '@/features/contacts/components/create-contact-form'
import type { Contact } from '@/features/contacts/types/contact'

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

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col lg:flex-row lg:gap-6">
      <section
        aria-label="Kontaktliste"
        className={`flex w-full flex-col lg:w-80 lg:shrink-0 ${
          showMobileDetail ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              Kontakte
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {totalCount === 1 ? '1 Kontakt' : `${totalCount} Kontakte`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartCreate}
            className="rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90"
          >
            Neuer Kontakt
          </button>
        </div>

        {totalCount === 0 ? (
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
        )}
      </section>

      <section
        aria-label="Kontaktdetails"
        className={`min-h-[24rem] flex-1 ${
          showMobileDetail ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {isCreating ? (
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
        )}
      </section>
    </div>
  )
}
