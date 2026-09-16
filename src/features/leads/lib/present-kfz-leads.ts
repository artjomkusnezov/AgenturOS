/**
 * Employee Leads workspace over existing Kfz inbox working copies.
 * No second lead database. No raw JSON in the normal UI.
 */

import { formatInboxDateTime, formatInboxListDate } from '@/features/inbox/lib/inbox-status'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import {
  presentKfzWebsiteInboxItem,
  type KfzSubmittedDocument,
  type KfzSubmittedFact,
  type KfzWebsiteInboxReview,
} from '@/features/inbox/lib/present-kfz-website-inbox'
import { KFZ_DOCUMENT_REVIEW_PATH } from '@/features/inbound/kfz/types/kfz-document-storage'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import {
  buildKfzLeadNextAction,
  countOpenKfzLeads,
  isKfzLeadItem,
  isKfzLeadStatus,
  isOpenKfzLead,
  KFZ_LEAD_NO_AUTO_VORGANG,
  KFZ_LEAD_STATUS_CHIP,
  KFZ_LEAD_STATUS_LABELS,
  KFZ_LEAD_STATUSES,
  resolveKfzLeadStatus,
  type KfzLeadStatus,
  type KfzLeadStatusChipKind,
} from '@/features/leads/lib/kfz-lead-status'

export const KFZ_LEADS_HREF_BASE = '/app/leads' as const
export const KFZ_LEADS_NAV_LABEL = 'Leads' as const
export const KFZ_LEADS_STATUS_PARAM = 'status' as const

export const KFZ_LEAD_STATUS_FILTERS = ['open', 'all', ...KFZ_LEAD_STATUSES] as const

export type KfzLeadStatusFilter = (typeof KFZ_LEAD_STATUS_FILTERS)[number]

export const KFZ_LEAD_STATUS_FILTER_LABELS: Record<KfzLeadStatusFilter, string> = {
  open: 'Offen',
  all: 'Alle',
  new: 'Neu',
  contacted: 'Kontaktiert',
  appointment: 'Termin/Angebot',
  won: 'Gewonnen',
  lost: 'Verloren',
}

export type KfzLeadRow = {
  itemId: string
  href: string
  headline: string
  customerName: string
  receivedAt: string
  receivedAtLabel: string
  receivedAtListLabel: string
  status: KfzLeadStatus
  statusLabel: string
  statusKind: KfzLeadStatusChipKind
  branchLabel: string | null
  requestSummary: string
  vehicle: string | null
  contact: string | null
  sourceLabel: string
  missingCount: number
  missingCountLabel: string
  nextAction: string
  hasDocuments: boolean
}

export type KfzLeadDetail = {
  itemId: string
  href: string
  inboxHref: string
  customerName: string
  receivedAtLabel: string
  status: KfzLeadStatus
  statusLabel: string
  statusKind: KfzLeadStatusChipKind
  nextAction: string
  noAutoVorgang: typeof KFZ_LEAD_NO_AUTO_VORGANG
  facts: KfzSubmittedFact[]
  documents: KfzSubmittedDocument[]
  review: KfzWebsiteInboxReview
  canPromote: true
  createsVorgangAutomatically: false
  documentPathAuthorized: true
}

export type KfzLeadsWorkspaceView = {
  hrefBasePath: string
  usesPreviewFixtures: boolean
  navLabel: typeof KFZ_LEADS_NAV_LABEL
  statusFilter: KfzLeadStatusFilter
  openCount: number
  totalCount: number
  metaLabel: string
  filterHrefs: Record<KfzLeadStatusFilter, string>
  rows: KfzLeadRow[]
  selectedItemId: string | null
  selectedDetail: KfzLeadDetail | null
  items: InboxItem[]
  noAutoVorgang: typeof KFZ_LEAD_NO_AUTO_VORGANG
}

export function parseKfzLeadStatusFilter(value: string | null | undefined): KfzLeadStatusFilter {
  if (value === 'all' || isKfzLeadStatus(value)) {
    return value
  }
  return 'open'
}

export function buildKfzLeadHref(options?: {
  itemId?: string | null
  status?: KfzLeadStatusFilter | null
  basePath?: string | null
}): string {
  const params = new URLSearchParams()
  const status = options?.status ?? 'open'
  if (status !== 'open') {
    params.set(KFZ_LEADS_STATUS_PARAM, status)
  }

  const itemId = options?.itemId?.trim() ?? ''
  if (itemId && isValidInboxItemId(itemId)) {
    params.set('item', itemId)
  }

  const basePath = options?.basePath?.trim() || KFZ_LEADS_HREF_BASE
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

function receivedAtOf(item: InboxItem): string {
  return item.received_at ?? item.created_at
}

function contactLabel(review: KfzWebsiteInboxReview): string | null {
  const parts = [review.phone, review.email].filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join(' · ') : null
}

export function presentKfzLeadRow(
  item: InboxItem,
  options?: {
    status?: KfzLeadStatusFilter | null
    basePath?: string | null
    documentReviewBasePath?: string
  },
): KfzLeadRow | null {
  if (!isKfzLeadItem(item)) {
    return null
  }

  const review = presentKfzWebsiteInboxItem(item, {
    documentReviewBasePath: options?.documentReviewBasePath ?? KFZ_DOCUMENT_REVIEW_PATH,
  })
  if (!review) {
    return null
  }

  const status = resolveKfzLeadStatus(item)
  const receivedAt = receivedAtOf(item)

  return {
    itemId: item.id,
    href: buildKfzLeadHref({
      itemId: item.id,
      status: options?.status,
      basePath: options?.basePath,
    }),
    headline: review.headline,
    customerName: review.customerName,
    receivedAt,
    receivedAtLabel: formatInboxDateTime(receivedAt),
    receivedAtListLabel: formatInboxListDate(receivedAt),
    status,
    statusLabel: KFZ_LEAD_STATUS_LABELS[status],
    statusKind: KFZ_LEAD_STATUS_CHIP[status],
    branchLabel: review.questionnaireBranch,
    requestSummary: review.listSummary,
    vehicle: review.vehicle,
    contact: contactLabel(review),
    sourceLabel: review.sourceLabel,
    missingCount: review.missingCount,
    missingCountLabel: review.missingCountLabel,
    nextAction: buildKfzLeadNextAction(status),
    hasDocuments: review.documents.length > 0,
  }
}

export function presentKfzLeadDetail(
  item: InboxItem,
  options?: {
    status?: KfzLeadStatusFilter | null
    basePath?: string | null
    documentReviewBasePath?: string
    inboxHrefBase?: string
  },
): KfzLeadDetail | null {
  const row = presentKfzLeadRow(item, options)
  const review = presentKfzWebsiteInboxItem(item, {
    documentReviewBasePath: options?.documentReviewBasePath ?? KFZ_DOCUMENT_REVIEW_PATH,
  })
  if (!row || !review) {
    return null
  }

  const inboxBase = options?.inboxHrefBase?.trim() || '/app/inbox'

  return {
    itemId: item.id,
    href: row.href,
    inboxHref: `${inboxBase}?item=${encodeURIComponent(item.id)}`,
    customerName: row.customerName,
    receivedAtLabel: row.receivedAtLabel,
    status: row.status,
    statusLabel: row.statusLabel,
    statusKind: row.statusKind,
    nextAction: row.nextAction,
    noAutoVorgang: KFZ_LEAD_NO_AUTO_VORGANG,
    facts: review.submittedFacts,
    documents: review.documents,
    review,
    canPromote: true,
    createsVorgangAutomatically: false,
    documentPathAuthorized: true,
  }
}

function sortLeadsNewestFirst(left: InboxItem, right: InboxItem): number {
  return receivedAtOf(right).localeCompare(receivedAtOf(left))
}

export function listKfzLeadItems(items: InboxItem[]): InboxItem[] {
  return items.filter((item) => isKfzLeadItem(item)).sort(sortLeadsNewestFirst)
}

export function filterKfzLeadItems(
  items: InboxItem[],
  statusFilter: KfzLeadStatusFilter,
): InboxItem[] {
  const leads = listKfzLeadItems(items)
  if (statusFilter === 'all') {
    return leads
  }
  if (statusFilter === 'open') {
    return leads.filter((item) => isOpenKfzLead(item))
  }
  return leads.filter((item) => resolveKfzLeadStatus(item) === statusFilter)
}

export function formatKfzLeadsMeta(openCount: number, totalCount: number): string {
  const openLabel = openCount === 1 ? '1 offener Lead' : `${openCount} offene Leads`
  if (totalCount === openCount) {
    return openLabel
  }
  return `${openLabel} · ${totalCount} gesamt`
}

export function presentKfzLeadsWorkspace(input: {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  selectedItemId?: string | null
  status?: string | null
  basePath?: string | null
  documentReviewBasePath?: string
  inboxHrefBase?: string
  usesPreviewFixtures?: boolean
}): KfzLeadsWorkspaceView {
  const allItems = [...input.unprocessedItems, ...input.processedItems]
  const leads = listKfzLeadItems(allItems)
  const statusFilter = parseKfzLeadStatusFilter(input.status)
  const visible = filterKfzLeadItems(allItems, statusFilter)
  const openCount = countOpenKfzLeads(leads)
  const requestedId = input.selectedItemId?.trim() ?? ''
  const selected =
    requestedId && isValidInboxItemId(requestedId)
      ? (visible.find((item) => item.id === requestedId) ??
        leads.find((item) => item.id === requestedId) ??
        null)
      : null

  const rows = visible
    .map((item) =>
      presentKfzLeadRow(item, {
        status: statusFilter,
        basePath: input.basePath,
        documentReviewBasePath: input.documentReviewBasePath,
      }),
    )
    .filter((row): row is KfzLeadRow => row !== null)

  const filterHrefs = Object.fromEntries(
    KFZ_LEAD_STATUS_FILTERS.map((filter) => [
      filter,
      buildKfzLeadHref({
        status: filter,
        itemId: selected?.id ?? null,
        basePath: input.basePath,
      }),
    ]),
  ) as Record<KfzLeadStatusFilter, string>

  return {
    hrefBasePath: input.basePath?.trim() || KFZ_LEADS_HREF_BASE,
    usesPreviewFixtures: input.usesPreviewFixtures === true,
    navLabel: KFZ_LEADS_NAV_LABEL,
    statusFilter,
    openCount,
    totalCount: leads.length,
    metaLabel: formatKfzLeadsMeta(openCount, leads.length),
    filterHrefs,
    rows,
    selectedItemId: selected?.id ?? null,
    selectedDetail: selected
      ? presentKfzLeadDetail(selected, {
          status: statusFilter,
          basePath: input.basePath,
          documentReviewBasePath: input.documentReviewBasePath,
          inboxHrefBase: input.inboxHrefBase,
        })
      : null,
    items: leads,
    noAutoVorgang: KFZ_LEAD_NO_AUTO_VORGANG,
  }
}
