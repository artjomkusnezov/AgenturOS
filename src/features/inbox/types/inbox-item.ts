import type { FileRecord } from '@/features/files/types/file'
import type { Tables } from '@/lib/supabase/types'

export type InboxItem = Tables<'inbox_items'>
export type InboxRelation = Tables<'inbox_relations'>

export type InboxLinkedFile = {
  relationId: string
  linkedAt: string
  file: FileRecord | null
  mediaUrl?: string | null
}

export type InboxItemFieldErrors = {
  content?: string
}

export type InboxItemMutationState = {
  fieldErrors?: InboxItemFieldErrors
  error?: string
  success?: boolean
  itemId?: string
  taskId?: string
  caseId?: string
  caseTypeKey?: string
  viewKey?: string
  promotionKind?: 'task' | 'offer' | 'claim'
}

export type InboxItemInput = {
  content: string
}
