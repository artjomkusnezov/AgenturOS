import type { InboxRelation } from '@/features/inbox/types/inbox-item'

export const INBOX_RELATION_TYPE_TASK = 'task' as const satisfies InboxRelation['relation_type']
