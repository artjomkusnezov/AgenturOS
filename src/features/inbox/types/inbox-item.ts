import type { Tables } from '@/lib/supabase/types'

export type InboxItem = Tables<'inbox_items'>

export type InboxItemFieldErrors = {
  content?: string
}

export type InboxItemMutationState = {
  fieldErrors?: InboxItemFieldErrors
  error?: string
  success?: boolean
  itemId?: string
}

export type InboxItemInput = {
  content: string
}
