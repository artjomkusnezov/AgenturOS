/**
 * Gemeinsame Inbox-Promotion (Punkt 31A).
 *
 * Eine Fassade: Cases nach caseType über Registry/Writer; Information eigener Pfad.
 * Keine createOfferFromInbox / createClaimFromInbox.
 */

import {
  createCaseFromInboxItem,
  createInformationFromInboxItem,
  createTaskCaseFromInboxItem,
} from '@/features/cases/services/case-promotion-writers'
import type { SystemCaseTypeKey } from '@/features/cases/types/case'
import {
  resolvePromotionViewKey,
  type InboxPromotionTarget,
  type PromoteInboxItemInput,
  type PromoteInboxItemResult,
} from '@/features/cases/types/inbox-promotion'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'

type CasePromotionFields = Extract<InboxPromotionTarget, { kind: 'case' }>

type CasePromoter = (
  inboxItemId: string,
  fields: CasePromotionFields,
) => Promise<PromoteInboxItemResult>

async function promoteInboxItemToTaskCase(
  inboxItemId: string,
  fields: CasePromotionFields,
): Promise<PromoteInboxItemResult> {
  const result = await createTaskCaseFromInboxItem({
    inboxItemId,
    title: fields.title,
    description: fields.description,
    assigneeUserId: fields.assigneeUserId,
    priority: fields.priority,
    dueAt: fields.dueAt,
    businessAreaKey: fields.businessAreaKey,
  })

  if (!result.success) {
    return result
  }

  const target: InboxPromotionTarget = {
    kind: 'case',
    caseType: 'task',
    businessAreaKey: fields.businessAreaKey,
    assigneeUserId: fields.assigneeUserId,
    title: fields.title,
    description: fields.description,
    dueAt: fields.dueAt,
    priority: fields.priority,
  }

  return {
    success: true,
    inboxItemId: result.inboxItemId,
    target,
    relationId: result.relationId,
    alreadyExisted: result.alreadyExisted,
    caseId: result.caseId ?? undefined,
    caseTypeKey: 'task',
    sourceTaskId: result.taskId,
    viewKey: resolvePromotionViewKey('task'),
  }
}

async function promoteInboxItemToGenericCase(
  inboxItemId: string,
  fields: CasePromotionFields,
): Promise<PromoteInboxItemResult> {
  const result = await createCaseFromInboxItem({
    inboxItemId,
    caseTypeKey: fields.caseType,
    businessAreaKey: fields.businessAreaKey,
    assigneeUserId: fields.assigneeUserId,
    title: fields.title,
    description: fields.description,
    dueAt: fields.dueAt,
    priority: fields.priority,
  })

  if (!result.success) {
    return result
  }

  return {
    success: true,
    inboxItemId: result.inboxItemId,
    target: fields,
    relationId: result.relationId,
    alreadyExisted: result.alreadyExisted,
    caseId: result.caseId,
    caseTypeKey: result.caseTypeKey,
    viewKey: resolvePromotionViewKey(result.caseTypeKey),
  }
}

/**
 * Registry: Case-Type → Promoter.
 * task delegiert an Task-Writer (Mirror); übrige an generischen Case-Writer.
 */
const CASE_PROMOTERS: Partial<Record<SystemCaseTypeKey, CasePromoter>> = {
  task: promoteInboxItemToTaskCase,
  offer: promoteInboxItemToGenericCase,
  claim: promoteInboxItemToGenericCase,
  follow_up: promoteInboxItemToGenericCase,
  general: promoteInboxItemToGenericCase,
}

export async function promoteInboxItem(
  input: PromoteInboxItemInput,
): Promise<PromoteInboxItemResult> {
  const { inboxItemId, target } = input

  if (!isValidInboxItemId(inboxItemId)) {
    return {
      success: false,
      error: 'Das Eingangselement ist ungültig.',
    }
  }

  if (target.kind === 'information') {
    const result = await createInformationFromInboxItem({
      inboxItemId,
      title: target.title,
      content: target.content,
      collectionKey: target.collectionKey,
    })

    if (!result.success) {
      return result
    }

    return {
      success: true,
      inboxItemId: result.inboxItemId,
      target,
      relationId: result.relationId,
      alreadyExisted: result.alreadyExisted,
      informationItemId: result.informationItemId,
    }
  }

  if (target.caseType === 'appointment' || target.caseType === 'contract') {
    return {
      success: false,
      error: 'Dieser Vorgangstyp kann noch nicht aus dem Eingang erzeugt werden.',
    }
  }

  const promoter = CASE_PROMOTERS[target.caseType]

  if (!promoter) {
    return {
      success: false,
      error: 'Dieser Vorgangstyp kann noch nicht aus dem Eingang erzeugt werden.',
    }
  }

  return promoter(inboxItemId, target)
}
