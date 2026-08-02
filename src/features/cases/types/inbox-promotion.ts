import type { SystemCaseTypeKey } from '@/features/cases/types/case'

/**
 * Ziel einer Inbox-Promotion (Punkt 30E).
 * Cases werden nach `caseType` dispatcht; Information ist architektonisch vorgesehen.
 */
export type InboxPromotionTarget =
  | {
      kind: 'case'
      caseType: SystemCaseTypeKey
      /** Optional; heute vom Task-Mirror noch nicht ausgewertet (Default: general). */
      businessAreaKey?: string
    }
  | {
      kind: 'information'
    }

export type PromoteInboxItemInput = {
  inboxItemId: string
  target: InboxPromotionTarget
}

export type PromoteInboxItemSuccess = {
  success: true
  inboxItemId: string
  target: InboxPromotionTarget
  /** Bei Case-Typ `task`: öffentliche Task-ID (URL/Mirror/`source_task_id`). */
  taskId?: string
  relationId?: string
}

export type PromoteInboxItemResult =
  | PromoteInboxItemSuccess
  | { success: false; error: string }
