/**
 * Authenticated employee inbox / dashboard presentation for the daily Kfz queue.
 * Uses existing normalized inbox items and manual states — never preview fixtures.
 */

import { AI_PROPOSAL_HUMAN_REVIEW_LABEL } from '@/features/ai-inbound/lib/format-proposal-labels'
import { parseInboxItemView, type InboxItemView } from '@/features/inbox/lib/inbox-item-view'
import {
  presentInboxManualReviewHistory,
  type InboxManualReviewHistory,
} from '@/features/inbox/lib/inbox-manual-review-history'
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
  buildInboxSourceFilterHrefs,
  countInboxSourceFilters,
  filterInboxItemsBySource,
  INBOX_SOURCE_FILTER_NAV_LABEL,
  parseInboxSourceFilter,
  type InboxSourceFilter,
  type InboxSourceFilterCounts,
} from '@/features/inbox/lib/inbox-source-filter'
import {
  buildInboxWorkQueueFilterHrefs,
  countInboxWorkQueue,
  filterInboxItemsByWorkQueue,
  formatInboxWorkQueueMeta,
  INBOX_WORK_QUEUE_FILTER_LABELS,
  INBOX_WORK_QUEUE_NAV_LABEL,
  parseInboxWorkQueueFilter,
  type InboxWorkQueueCounts,
  type InboxWorkQueueFilter,
} from '@/features/inbox/lib/inbox-factual-work-queue'
import {
  presentUnifiedInboxCard,
  type UnifiedInboxCard,
} from '@/features/inbox/lib/present-unified-inbox-card'
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
  history: InboxManualReviewHistory
  activeView: InboxItemView
  historyHref: string
  workHref: string
  sections: {
    facts: true
    missingInformation: true
    preferredChannel: true
    replyHandoff: true
    task: true
    notes: true
    editableDraft: true
    history: true
  }
  aiSuggestionRequiresHumanReview: typeof AI_PROPOSAL_HUMAN_REVIEW_LABEL
  manualStatusOnly: true
  noExternalSideEffect: true
}

export type AuthenticatedKfzInboxView = {
  hrefBasePath: typeof AUTHENTICATED_INBOX_PATH
  usesPreviewFixtures: false
  navLabel: typeof KFZ_WORK_QUEUE_NAV_LABEL
  workQueueNavLabel: typeof INBOX_WORK_QUEUE_NAV_LABEL
  sourceNavLabel: typeof INBOX_SOURCE_FILTER_NAV_LABEL
  phaseFilter: KfzWorkQueueFilter
  queueFilter: InboxWorkQueueFilter
  sourceFilter: InboxSourceFilter
  queueMode: boolean
  queueHeading: string | null
  counts: KfzWorkQueueCounts
  workQueueCounts: InboxWorkQueueCounts
  sourceCounts: InboxSourceFilterCounts
  kfzCount: number
  totalInboxCount: number
  metaLabel: string
  filterHrefs: Record<KfzWorkQueueFilter, string>
  workQueueFilterHrefs: Record<InboxWorkQueueFilter, string>
  sourceFilterHrefs: Record<InboxSourceFilter, string>
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  rows: KfzWorkQueueRow[]
  cards: UnifiedInboxCard[]
  selectedItemId: string | null
  selectedCard: UnifiedInboxCard | null
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
    queue?: string | null
    source?: InboxSourceFilter | null
    view?: string | null
    allowLocalFixtureFacts?: boolean
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
  const hrefOptions = {
    itemId: item.id,
    phase: options?.phase ?? 'all',
    queue: options?.queue ?? 'all',
    source: options?.source ?? 'all',
    basePath: AUTHENTICATED_INBOX_PATH,
  }
  const history = presentInboxManualReviewHistory(item, {
    linkedTaskId,
    phase: hrefOptions.phase,
    queue: hrefOptions.queue,
    source: hrefOptions.source,
    view: options?.view,
    basePath: AUTHENTICATED_INBOX_PATH,
    allowLocalFixtureFacts: options?.allowLocalFixtureFacts === true,
  })

  return {
    itemId: item.id,
    href: buildInboxHref(hrefOptions),
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
    history,
    activeView: parseInboxItemView(options?.view),
    historyHref: history.historyHref,
    workHref: history.workHref,
    sections: {
      facts: true,
      missingInformation: true,
      preferredChannel: true,
      replyHandoff: true,
      task: true,
      notes: true,
      editableDraft: true,
      history: true,
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
  queue?: string | null
  source?: string | null
  view?: string | null
  allowLocalFixtureFacts?: boolean
  now?: Date
}): AuthenticatedKfzInboxView {
  const phaseFilter = parseKfzWorkQueueFilter(input.phase)
  const queueFilter = parseInboxWorkQueueFilter(input.queue)
  const sourceFilter = parseInboxSourceFilter(input.source)
  const unprocessedItems = input.unprocessedItems
  const processedItems = input.processedItems
  const taskRelationsByItemId = input.taskRelationsByItemId ?? {}
  const allItems = [...unprocessedItems, ...processedItems]
  const counts = countKfzWorkQueue(allItems, taskRelationsByItemId)
  const workQueueCounts = countInboxWorkQueue(allItems, {
    taskRelationsByItemId,
    now: input.now,
  })
  const sourceCounts = countInboxSourceFilters(allItems)
  const kfzCount = sumKfzWorkQueueCounts(counts)
  const totalInboxCount = allItems.length
  const elementLabel = totalInboxCount === 1 ? '1 Element' : `${totalInboxCount} Elemente`
  const kfzMeta = formatKfzWorkQueueMeta(counts)
  const workQueueMeta = formatInboxWorkQueueMeta(workQueueCounts)
  const queueMeta = [workQueueMeta, kfzMeta].filter(Boolean).join(' · ') || null
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
  const visibleUnprocessed = filterInboxItemsByWorkQueue(
    filterInboxItemsByKfzPhase(
      filterInboxItemsBySource(unprocessedItems, sourceFilter),
      phaseFilter,
      taskRelationsByItemId,
    ),
    queueFilter,
    { taskRelationsByItemId, now: input.now },
  )
  const visibleProcessed = filterInboxItemsByWorkQueue(
    filterInboxItemsByKfzPhase(
      filterInboxItemsBySource(processedItems, sourceFilter),
      phaseFilter,
      taskRelationsByItemId,
    ),
    queueFilter,
    { taskRelationsByItemId, now: input.now },
  )
  const visibleItems = [...visibleUnprocessed, ...visibleProcessed]
  const rows = visibleItems
    .map((item) =>
      presentKfzWorkQueueRow(item, {
        linkedTaskId: resolveInboxLinkedTaskId(item.id, taskRelationsByItemId),
        phase: phaseFilter,
        source: sourceFilter,
        basePath: AUTHENTICATED_INBOX_PATH,
      }),
    )
    .filter((row): row is KfzWorkQueueRow => row !== null)
  const cards = visibleItems.map((item) =>
    presentUnifiedInboxCard(item, {
      linkedTaskId: resolveInboxLinkedTaskId(item.id, taskRelationsByItemId),
      phase: phaseFilter,
      queue: queueFilter,
      source: sourceFilter,
      basePath: AUTHENTICATED_INBOX_PATH,
      now: input.now,
      allowLocalFixtureFacts: input.allowLocalFixtureFacts === true,
    }),
  )
  const selectedCard = selectedItem
    ? presentUnifiedInboxCard(selectedItem, {
        linkedTaskId: resolveInboxLinkedTaskId(
          selectedItem.id,
          taskRelationsByItemId,
        ),
        phase: phaseFilter,
        queue: queueFilter,
        source: sourceFilter,
        basePath: AUTHENTICATED_INBOX_PATH,
        now: input.now,
        allowLocalFixtureFacts: input.allowLocalFixtureFacts === true,
      })
    : null

  return {
    hrefBasePath: AUTHENTICATED_INBOX_PATH,
    usesPreviewFixtures: false,
    navLabel: KFZ_WORK_QUEUE_NAV_LABEL,
    workQueueNavLabel: INBOX_WORK_QUEUE_NAV_LABEL,
    sourceNavLabel: INBOX_SOURCE_FILTER_NAV_LABEL,
    phaseFilter,
    queueFilter,
    sourceFilter,
    queueMode: phaseFilter !== 'all' || queueFilter !== 'all',
    queueHeading:
      queueFilter !== 'all'
        ? INBOX_WORK_QUEUE_FILTER_LABELS[queueFilter]
        : phaseFilter === 'all'
          ? null
          : KFZ_WORK_QUEUE_PHASE_LABELS[phaseFilter],
    counts,
    workQueueCounts,
    sourceCounts,
    kfzCount,
    totalInboxCount,
    metaLabel: queueMeta ? `${queueMeta} · ${elementLabel}` : elementLabel,
    filterHrefs: buildKfzWorkQueueFilterHrefs({
      selectedItemId,
      selectedPhase,
      source: sourceFilter,
      queue: queueFilter,
      basePath: AUTHENTICATED_INBOX_PATH,
    }),
    workQueueFilterHrefs: buildInboxWorkQueueFilterHrefs({
      selectedItemId,
      selectedItem,
      linkedTaskId: selectedItem
        ? resolveInboxLinkedTaskId(selectedItem.id, taskRelationsByItemId)
        : null,
      phase: phaseFilter,
      source: sourceFilter,
      basePath: AUTHENTICATED_INBOX_PATH,
      now: input.now,
    }),
    sourceFilterHrefs: buildInboxSourceFilterHrefs({
      selectedItemId,
      selectedItem,
      phase: phaseFilter,
      queue: queueFilter,
      basePath: AUTHENTICATED_INBOX_PATH,
    }),
    unprocessedItems: visibleUnprocessed,
    processedItems: visibleProcessed,
    rows,
    cards,
    selectedItemId,
    selectedCard,
    selectedWorkspace: selectedItem
      ? presentAuthenticatedKfzReviewWorkspace(selectedItem, {
          linkedTaskId: resolveInboxLinkedTaskId(
            selectedItem.id,
            taskRelationsByItemId,
          ),
          phase: phaseFilter,
          queue: queueFilter,
          source: sourceFilter,
          view: input.view,
          allowLocalFixtureFacts: input.allowLocalFixtureFacts === true,
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
