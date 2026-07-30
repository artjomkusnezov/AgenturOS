import { createClient } from '@/lib/supabase/server'
import { sortContacts } from '@/features/contacts/lib/sort-contacts'
import type { Contact } from '@/features/contacts/types/contact'

type RepositoryError = {
  success: false
  error: string
}

type ListContactsResult =
  | { success: true; contacts: Contact[] }
  | RepositoryError

type ContactResult =
  | { success: true; contact: Contact }
  | RepositoryError

type DeleteContactResult =
  | { success: true }
  | RepositoryError

type ContactWriteInput = {
  first_name: string | null
  last_name: string | null
  company: string | null
  email: string | null
  phone: string | null
  notes: string | null
}

async function getAuthenticatedUserId(): Promise<
  { success: true; userId: string } | RepositoryError
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      success: false,
      error: 'Sie sind nicht angemeldet.',
    }
  }

  return {
    success: true,
    userId: user.id,
  }
}

export async function listContactsForCurrentUser(): Promise<ListContactsResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', authResult.userId)

  if (error) {
    return {
      success: false,
      error: 'Die Kontakte konnten nicht geladen werden.',
    }
  }

  return {
    success: true,
    contacts: sortContacts(data),
  }
}

export async function getContactForCurrentUser(contactId: string): Promise<ContactResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .eq('user_id', authResult.userId)
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Der Kontakt konnte nicht geladen werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Der Kontakt wurde nicht gefunden.',
    }
  }

  return {
    success: true,
    contact: data,
  }
}

export async function createContactForCurrentUser(
  input: ContactWriteInput
): Promise<ContactResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id: authResult.userId,
      first_name: input.first_name,
      last_name: input.last_name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
    })
    .select('*')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: 'Der Kontakt konnte nicht erstellt werden.',
    }
  }

  return {
    success: true,
    contact: data,
  }
}

export async function updateContactForCurrentUser(
  contactId: string,
  input: ContactWriteInput
): Promise<ContactResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .update({
      first_name: input.first_name,
      last_name: input.last_name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contactId)
    .eq('user_id', authResult.userId)
    .select('*')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Der Kontakt konnte nicht gespeichert werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Der Kontakt wurde nicht gefunden.',
    }
  }

  return {
    success: true,
    contact: data,
  }
}

export async function deleteContactForCurrentUser(
  contactId: string
): Promise<DeleteContactResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)
    .eq('user_id', authResult.userId)
    .select('id')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Der Kontakt konnte nicht gelöscht werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Der Kontakt wurde nicht gefunden.',
    }
  }

  return {
    success: true,
  }
}
