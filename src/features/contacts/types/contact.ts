import type { Tables } from '@/lib/supabase/types'

export type Contact = Tables<'contacts'>

export type ContactFieldErrors = {
  identity?: string
  firstName?: string
  lastName?: string
  company?: string
  email?: string
  phone?: string
  notes?: string
}

export type ContactMutationState = {
  fieldErrors?: ContactFieldErrors
  error?: string
  success?: boolean
  contactId?: string
}

export type ContactInput = {
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
  notes: string
}
