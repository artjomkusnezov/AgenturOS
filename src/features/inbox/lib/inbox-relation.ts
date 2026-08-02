import type { InboxRelation } from '@/features/inbox/types/inbox-item'

export const INBOX_RELATION_TYPE_TASK = 'task' as const
export const INBOX_RELATION_TYPE_CASE = 'case' as const
export const INBOX_RELATION_TYPE_INFORMATION = 'information' as const

export const INBOX_MAIN_RELATION_TYPES = [
  INBOX_RELATION_TYPE_TASK,
  INBOX_RELATION_TYPE_CASE,
  INBOX_RELATION_TYPE_INFORMATION,
] as const

export type InboxMainRelationType = (typeof INBOX_MAIN_RELATION_TYPES)[number]

export function isInboxMainRelationType(
  value: string,
): value is InboxMainRelationType {
  return (INBOX_MAIN_RELATION_TYPES as readonly string[]).includes(value)
}

export type InboxRelationRecord = InboxRelation
