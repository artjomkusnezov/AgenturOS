import type { SystemCaseTypeKey } from '@/features/cases/types/case'

/**
 * Ziel einer Inbox-Promotion (Punkt 31A).
 * Cases nach caseType; Information als eigenes Target-Kind.
 */
export type InboxPromotionTarget =
  | {
      kind: 'case'
      caseType: SystemCaseTypeKey
      businessAreaKey?: string
      assigneeUserId?: string | null
      title?: string | null
      description?: string | null
      dueAt?: string | null
      priority?: 'low' | 'normal' | 'high' | null
    }
  | {
      kind: 'information'
      collectionKey?: string
      title?: string | null
      content?: string | null
    }

export type PromoteInboxItemInput = {
  inboxItemId: string
  target: InboxPromotionTarget
}

export type InboxPromotionViewKey =
  | 'tasks'
  | 'offers'
  | 'claims'
  | 'follow-ups'
  | 'cases'
export type PromoteInboxItemSuccess = {
  success: true
  inboxItemId: string
  target: InboxPromotionTarget
  relationId: string
  alreadyExisted?: boolean
  /** Case-Ziel */
  caseId?: string
  caseTypeKey?: SystemCaseTypeKey
  /** Task-Spiegel-ID (nur caseType task) */
  sourceTaskId?: string
  /** Empfohlene Workspace-View für 31B-Navigation */
  viewKey?: string
  /** Information-Ziel */
  informationItemId?: string
}

export type PromoteInboxItemResult =
  | PromoteInboxItemSuccess
  | { success: false; error: string }

export function resolvePromotionViewKey(
  caseTypeKey: SystemCaseTypeKey,
): string {
  switch (caseTypeKey) {
    case 'task':
      return 'tasks'
    case 'offer':
      return 'offers'
    case 'claim':
      return 'claims'
    case 'follow_up':
      return 'follow-ups'
    case 'general':
    default:
      return 'cases'
  }
}
