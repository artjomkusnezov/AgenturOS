import type { Tables } from '@/lib/supabase/types'

export type InboxItem = Tables<'inbox_items'>
export type InboxRelation = Tables<'inbox_relations'>

export type InboxItemFieldErrors = {
  content?: string
}

export type InboxItemMutationState = {
  fieldErrors?: InboxItemFieldErrors
  error?: string
  success?: boolean
  itemId?: string
  taskId?: string
}

export type InboxItemInput = {
  content: string
}
