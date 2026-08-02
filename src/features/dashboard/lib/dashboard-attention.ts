import {
  formatCaseCoreStatusLabel,
  formatCaseDueAtLabel,
  isCaseDueOverdue,
  isCaseOpenForDue,
  resolveCaseTypeKey,
  resolveCaseTypeLabel,
  type CaseTypeLookup,
} from '@/features/cases/lib/case-display'
import type { CaseCoreStatus, CasePriority, CaseRecord } from '@/features/cases/types/case'
import { buildDashboardCaseHref } from '@/features/dashboard/lib/dashboard-case-href'
import { getTodayDateString } from '@/features/tasks/lib/task-status'

export type AttentionBucket = 'overdue' | 'today' | 'soon' | 'waiting'

export const ATTENTION_BUCKET_LABELS: Record<AttentionBucket, string> = {
  overdue: 'Überfällig',
  today: 'Heute',
  soon: 'In Kürze',
  waiting: 'Wartet auf Rückmeldung',
}

const ATTENTION_BUCKET_ORDER: Record<AttentionBucket, number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  waiting: 3,
}

export type DashboardAttentionItem = {
  caseId: string
  title: string
  typeLabel: string
  typeKey: string | null
  href: string
  bucket: AttentionBucket
  bucketLabel: string
  dueAt: string | null
  dueLabel: string | null
  priority: CasePriority
  coreStatus: CaseCoreStatus
  statusLabel: string
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

/** Kalendertage von heute bis due_at (negativ = überfällig). */
export function daysUntilDueAt(dueAt: string, today: string): number {
  const due = parseDateOnly(dueAt)
  const base = parseDateOnly(today)
  return Math.round((due.getTime() - base.getTime()) / (24 * 60 * 60 * 1000))
}

/**
 * Stufen laut 32A: Überfällig → Heute → 1–3 Tage → Wartet.
 * 4–7 Tage / Später erscheinen nicht.
 */
export function classifyAttentionBucket(
  caseRow: CaseRecord,
  today = getTodayDateString(),
): AttentionBucket | null {
  if (!isCaseOpenForDue(caseRow)) {
    return null
  }

  if (caseRow.due_at) {
    if (isCaseDueOverdue(caseRow, today)) {
      return 'overdue'
    }

    if (caseRow.due_at === today) {
      return 'today'
    }

    const days = daysUntilDueAt(caseRow.due_at, today)
    if (days >= 1 && days <= 3) {
      return 'soon'
    }
  }

  if (caseRow.core_status === 'waiting') {
    return 'waiting'
  }

  return null
}

function priorityScore(priority: CasePriority): number {
  if (priority === 'high') {
    return 0
  }
  if (priority === 'normal') {
    return 1
  }
  return 2
}

function compareAttentionItems(a: DashboardAttentionItem, b: DashboardAttentionItem): number {
  const bucketDiff =
    ATTENTION_BUCKET_ORDER[a.bucket] - ATTENTION_BUCKET_ORDER[b.bucket]
  if (bucketDiff !== 0) {
    return bucketDiff
  }

  if (a.dueAt && b.dueAt && a.dueAt !== b.dueAt) {
    return a.dueAt.localeCompare(b.dueAt)
  }

  if (a.dueAt && !b.dueAt) {
    return -1
  }

  if (!a.dueAt && b.dueAt) {
    return 1
  }

  const priorityDiff = priorityScore(a.priority) - priorityScore(b.priority)
  if (priorityDiff !== 0) {
    return priorityDiff
  }

  return a.title.localeCompare(b.title, 'de')
}

export function selectAttentionCasesForDashboard(
  cases: CaseRecord[],
  caseTypesById: Record<string, CaseTypeLookup>,
  options: { today?: string; limit?: number } = {},
): DashboardAttentionItem[] {
  const today = options.today ?? getTodayDateString()
  const limit = options.limit ?? 12

  const items: DashboardAttentionItem[] = []

  for (const caseRow of cases) {
    const bucket = classifyAttentionBucket(caseRow, today)
    if (!bucket) {
      continue
    }

    const typeKey = resolveCaseTypeKey(caseRow.case_type_id, caseTypesById)
    const typeLabel = resolveCaseTypeLabel(caseRow.case_type_id, caseTypesById)
    const dueLabel = caseRow.due_at
      ? formatCaseDueAtLabel(caseRow.due_at, today, isCaseOpenForDue(caseRow))
      : null

    items.push({
      caseId: caseRow.id,
      title: caseRow.title.trim() || typeLabel,
      typeLabel,
      typeKey,
      href: buildDashboardCaseHref(caseRow, typeKey),
      bucket,
      bucketLabel: ATTENTION_BUCKET_LABELS[bucket],
      dueAt: caseRow.due_at,
      dueLabel,
      priority: caseRow.priority,
      coreStatus: caseRow.core_status,
      statusLabel: formatCaseCoreStatusLabel(caseRow.core_status),
    })
  }

  return items.sort(compareAttentionItems).slice(0, limit)
}

export function countAttentionCases(
  cases: CaseRecord[],
  today = getTodayDateString(),
): number {
  return cases.filter((caseRow) => classifyAttentionBucket(caseRow, today) !== null).length
}
