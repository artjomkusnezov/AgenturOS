/**
 * Authenticated employee inbox / dashboard presentation for the daily Kfz queue.
 * Uses existing normalized inbox items and manual states — never preview fixtures.
 */

import { AI_PROPOSAL_HUMAN_REVIEW_LABEL } from '@/features/ai-inbound/lib/format-proposal-labels'
import {
  KFZ_INTERNAL_NOTE_HEADING,
  type KfzTriagePhase,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  KFZ_AI_DRAFT_REVIEW_LABEL,
  KFZ_RESPONSE_DRAFT_NO_SEND,
  splitInboxWorkingCopy,
} from '@/features/inbox/lib/kfz-response-draft'
import {
  buildInboxHref,
  buildKfzWorkQueueFilterHrefs,
  buildTaskHref,
  countKfzWorkQueue,
  filterInboxItemsByKfzPhase,
  formatKfzWorkQueueMeta,
  KFZ_INBOX_HREF_BASE,
  KFZ_WORK_QUEUE_NAV_LABEL,
  KFZ_WORK_QUEUE_PHASE_LABELS,
  parseKfzWorkQueueFilter,
  presentKfzWorkQueueRow,
  resolveInboxLinkedTaskId,
  resolveKfzWorkQueuePhase,
  sumKfzWorkQueueCounts,
  type KfzWorkQueueCounts,
  type KfzWorkQueueFilter,
  type KfzWorkQueuePhase,
  type KfzWorkQueueRow,
} from '@/features/inbox/lib/kfz-work-queue'
import {
  presentKfzWebsiteInboxItem,
  type KfzMissingInfoCheck,
  type KfzSubmittedFact,
} from '@/features/inbox/lib/present-kfz-website-inbox'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export const AUTHENTICATED_INBOX_PATH = KFZ_INBOX_HREF_BASE
export const AUTHENTICATED_DASHBOARD_PATH = '/app' as const

export type AuthenticatedKfzReviewWorkspace = {
  itemId: string
  href: string
  customerName: string
  queuePhase: KfzWorkQueuePhase
  queuePhaseLabel: string
  triagePhase: KfzTriagePhase
  facts: KfzSubmittedFact[]
  factualSummary: string
  missingInformationChecklist: KfzMissingInfoCheck[]
  missingCount: number
  task: {
    linkedTaskId: string | null
    href: string | null
    canCreateFollowUp: boolean
  }
  notes: {
    value: string
    canRecord: true
    heading: typeof KFZ_INTERNAL_NOTE_HEADING
  }
  editableDraft: {
    value: string
    noSendLabel: typeof KFZ_RESPONSE_DRAFT_NO_SEND
    aiSuggestionRequiresHumanReview: typeof KFZ_AI_DRAFT_REVIEW_LABEL
  }
  sections: {
    facts: true
    missingInformation: true
    task: true
    notes: true
    editableDraft: true
  }
  aiSuggestionRequiresHumanReview: typeof AI_PROPOSAL_HUMAN_REVIEW_LABEL
  manualStatusOnly: true
  noExternalSideEffect: true
}

export type AuthenticatedKfzInboxView = {
  hrefBasePath: typeof AUTHENTICATED_INBOX_PATH
  usesPreviewFixtures: false
  navLabel: typeof KFZ_WORK_QUEUE_NAV_LABEL
  phaseFilter: KfzWorkQueueFilter
  queueMode: boolean
  queueHeading: string | null
  counts: KfzWorkQueueCounts
  kfzCount: number
  totalInboxCount: number
  metaLabel: string
  filterHrefs: Record<KfzWorkQueueFilter, string>
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  rows: KfzWorkQueueRow[]
  selectedItemId: string | null
  selectedWorkspace: AuthenticatedKfzReviewWorkspace | null
}

export type DashboardKfzQueueView = {
  hrefBasePath: typeof AUTHENTICATED_INBOX_PATH
  usesPreviewFixtures: false
  navLabel: typeof KFZ_WORK_QUEUE_NAV_LABEL
  counts: KfzWorkQueueCounts
  kfzCount: number
  filterHrefs: Record<KfzWorkQueueFilter, string>
  previewRows: KfzWorkQueueRow[]
}

export function presentAuthenticatedKfzReviewWorkspace(
  item: InboxItem,
  options?: {
    linkedTaskId?: string | null
    phase?: KfzWorkQueueFilter | null
  },
): AuthenticatedKfzReviewWorkspace | null {
  const linkedTaskId = options?.linkedTaskId ?? null
  const review = presentKfzWebsiteInboxItem(item, { linkedTaskId })
  if (!review) {
    return null
  }

  const queuePhase = resolveKfzWorkQueuePhase(item, linkedTaskId)
  if (!queuePhase) {
    return null
  }

  const followUp = review.availableActions.find(
    (action) => action.id === 'create_follow_up_task',
  )

  return {
    itemId: item.id,
    href: buildInboxHref({
      itemId: item.id,
      phase: options?.phase ?? 'all',
      basePath: AUTHENTICATED_INBOX_PATH,
    }),
    customerName: review.customerName,
    queuePhase,
    queuePhaseLabel: KFZ_WORK_QUEUE_PHASE_LABELS[queuePhase],
    triagePhase: review.phase,
    facts: review.submittedFacts,
    factualSummary: review.factualSummary,
    missingInformationChecklist: review.missingInformationChecklist,
    missingCount: review.missingCount,
    task: {
      linkedTaskId,
      href: linkedTaskId ? buildTaskHref(linkedTaskId) : null,
      canCreateFollowUp: Boolean(followUp?.available) && !linkedTaskId,
    },
    notes: {
      value: splitInboxWorkingCopy(item.content).notes,
      canRecord: true,
      heading: KFZ_INTERNAL_NOTE_HEADING,
    },
    editableDraft: {
      value: review.responseDraft,
      noSendLabel: KFZ_RESPONSE_DRAFT_NO_SEND,
      aiSuggestionRequiresHumanReview: KFZ_AI_DRAFT_REVIEW_LABEL,
    },
    sections: {
      facts: true,
      missingInformation: true,
      task: true,
      notes: true,
      editableDraft: true,
    },
    aiSuggestionRequiresHumanReview: AI_PROPOSAL_HUMAN_REVIEW_LABEL,
    manualStatusOnly: true,
    noExternalSideEffect: true,
  }
}

export function presentAuthenticatedKfzInbox(input: {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  taskRelationsByItemId?: Record<string, string>
  selectedItemId?: string | null
  phase?: string | null
}): AuthenticatedKfzInboxView {
  const phaseFilter = parseKfzWorkQueueFilter(input.phase)
  const unprocessedItems = input.unprocessedItems
  const processedItems = input.processedItems
  const taskRelationsByItemId = input.taskRelationsByItemId ?? {}
  const allItems = [...unprocessedItems, ...processedItems]
  const counts = countKfzWorkQueue(allItems, taskRelationsByItemId)
  const kfzCount = sumKfzWorkQueueCounts(counts)
  const totalInboxCount = allItems.length
  const elementLabel = totalInboxCount === 1 ? '1 Element' : `${totalInboxCount} Elemente`
  const queueMeta = formatKfzWorkQueueMeta(counts)
  const requestedId = input.selectedItemId?.trim() ?? ''
  const selectedItem =
    requestedId &&
    isValidInboxItemId(requestedId) &&
    allItems.some((item) => item.id === requestedId)
      ? (allItems.find((item) => item.id === requestedId) ?? null)
      : null
  const selectedItemId = selectedItem?.id ?? null
  const selectedPhase = selectedItem
    ? resolveKfzWorkQueuePhase(
        selectedItem,
        resolveInboxLinkedTaskId(selectedItem.id, taskRelationsByItemId),
      )
    : null
  const visibleUnprocessed = filterInboxItemsByKfzPhase(
    unprocessedItems,
    phaseFilter,
    taskRelationsByItemId,
  )
  const visibleProcessed = filterInboxItemsByKfzPhase(
    processedItems,
    phaseFilter,
    taskRelationsByItemId,
  )
  const rows = [...visibleUnprocessed, ...visibleProcessed]
    .map((item) =>
      presentKfzWorkQueueRow(item, {
        linkedTaskId: resolveInboxLinkedTaskId(item.id, taskRelationsByItemId),
        phase: phaseFilter,
        basePath: AUTHENTICATED_INBOX_PATH,
      }),
    )
    .filter((row): row is KfzWorkQueueRow => row !== null)

  return {
    hrefBasePath: AUTHENTICATED_INBOX_PATH,
    usesPreviewFixtures: false,
    navLabel: KFZ_WORK_QUEUE_NAV_LABEL,
    phaseFilter,
    queueMode: phaseFilter !== 'all',
    queueHeading:
      phaseFilter === 'all' ? null : KFZ_WORK_QUEUE_PHASE_LABELS[phaseFilter],
    counts,
    kfzCount,
    totalInboxCount,
    metaLabel: queueMeta ? `${queueMeta} · ${elementLabel}` : elementLabel,
    filterHrefs: buildKfzWorkQueueFilterHrefs({
      selectedItemId,
      selectedPhase,
      basePath: AUTHENTICATED_INBOX_PATH,
    }),
    unprocessedItems: visibleUnprocessed,
    processedItems: visibleProcessed,
    rows,
    selectedItemId,
    selectedWorkspace: selectedItem
      ? presentAuthenticatedKfzReviewWorkspace(selectedItem, {
          linkedTaskId: resolveInboxLinkedTaskId(
            selectedItem.id,
            taskRelationsByItemId,
          ),
          phase: phaseFilter,
        })
      : null,
  }
}

export function presentDashboardKfzQueue(input: {
  unprocessedItems: InboxItem[]
  processedItems?: InboxItem[]
  taskRelationsByItemId?: Record<string, string>
}): DashboardKfzQueueView {
  const unprocessedItems = input.unprocessedItems
  const processedItems = input.processedItems ?? []
  const taskRelationsByItemId = input.taskRelationsByItemId ?? {}
  const counts = countKfzWorkQueue(
    [...unprocessedItems, ...processedItems],
    taskRelationsByItemId,
  )
  const previewRows = unprocessedItems
    .slice(0, 3)
    .map((item) =>
      presentKfzWorkQueueRow(item, {
        linkedTaskId: resolveInboxLinkedTaskId(item.id, taskRelationsByItemId),
        basePath: AUTHENTICATED_INBOX_PATH,
      }),
    )
    .filter((row): row is KfzWorkQueueRow => row !== null)

  return {
    hrefBasePath: AUTHENTICATED_INBOX_PATH,
    usesPreviewFixtures: false,
    navLabel: KFZ_WORK_QUEUE_NAV_LABEL,
    counts,
    kfzCount: sumKfzWorkQueueCounts(counts),
    filterHrefs: buildKfzWorkQueueFilterHrefs({
      basePath: AUTHENTICATED_INBOX_PATH,
    }),
    previewRows,
  }
}

export function isAuthenticatedInboxHref(href: string): boolean {
  return href === AUTHENTICATED_INBOX_PATH || href.startsWith(`${AUTHENTICATED_INBOX_PATH}?`)
}
