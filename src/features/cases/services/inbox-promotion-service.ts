/**
 * Gemeinsame Inbox-Promotion (Punkt 30E).
 *
 * Ein Eingang erzeugt künftig Cases nach `case_type` — nicht mehr ausschließlich Tasks.
 * Heute produktiv: `case` + `task` (über CaseTaskService → RPC → Mirror).
 * Weitere Case-Types und Ziel `information` sind als Registry/Target vorbereitet.
 *
 * Keine Spezialfunktionen createOfferFromInbox / createClaimFromInbox:
 * `promoteInboxItem` + Registry entscheiden.
 */

import { createTaskCaseFromInboxItem } from '@/features/cases/services/case-task-service'
import type { SystemCaseTypeKey } from '@/features/cases/types/case'
import type {
  InboxPromotionTarget,
  PromoteInboxItemInput,
  PromoteInboxItemResult,
} from '@/features/cases/types/inbox-promotion'

type CasePromotionContext = {
  businessAreaKey?: string
}

type CasePromoter = (
  inboxItemId: string,
  context: CasePromotionContext,
) => Promise<PromoteInboxItemResult>

async function promoteInboxItemToTaskCase(
  inboxItemId: string,
  context: CasePromotionContext,
): Promise<PromoteInboxItemResult> {
  void context.businessAreaKey
  const result = await createTaskCaseFromInboxItem(inboxItemId)

  if (!result.success) {
    return result
  }

  const target: InboxPromotionTarget = { kind: 'case', caseType: 'task' }

  return {
    success: true,
    inboxItemId: result.inboxItemId,
    target,
    taskId: result.taskId,
    relationId: result.relationId,
  }
}

/**
 * Registry: Case-Type → Promoter.
 * Fehlende Keys = noch nicht implementiert (kein if/else-Wald pro Typ).
 */
const CASE_PROMOTERS: Partial<Record<SystemCaseTypeKey, CasePromoter>> = {
  task: promoteInboxItemToTaskCase,
}

export async function promoteInboxItem(
  input: PromoteInboxItemInput,
): Promise<PromoteInboxItemResult> {
  const { inboxItemId, target } = input

  if (target.kind === 'information') {
    return {
      success: false,
      error: 'Die Übernahme als Information ist noch nicht verfügbar.',
    }
  }

  const promoter = CASE_PROMOTERS[target.caseType]

  if (!promoter) {
    return {
      success: false,
      error: 'Dieser Vorgangstyp kann noch nicht aus dem Eingang erzeugt werden.',
    }
  }

  return promoter(inboxItemId, {
    businessAreaKey: target.businessAreaKey,
  })
}
