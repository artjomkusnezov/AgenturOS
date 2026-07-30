import { ContactsWorkspace } from '@/features/contacts/components/contacts-workspace'
import { listContactsForCurrentUser } from '@/features/contacts/repositories/contacts-repository'
import { isValidContactId } from '@/features/contacts/lib/validate-contact'

type ContactsPageProps = {
  searchParams: Promise<{ contactId?: string }>
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const { contactId } = await searchParams
  const result = await listContactsForCurrentUser()

  if (!result.success) {
    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50 px-5 py-4 text-sm text-red-700">
        {result.error}
      </div>
    )
  }

  const initialContactId =
    contactId && isValidContactId(contactId) ? contactId : null

  return (
    <ContactsWorkspace
      contacts={result.contacts}
      initialContactId={initialContactId}
    />
  )
}
