import type {
  BusinessAreaRecord,
  CaseCoreStatus,
  CasePriority,
  CaseRecord,
  CaseTypeRecord,
} from '@/features/cases/types/case'
import { CASE_CORE_STATUSES } from '@/features/cases/types/case'
import { TASK_PRIORITY_LABELS } from '@/features/tasks/lib/task-priority'
import {
  formatDueDateLabel,
  getTodayDateString,
} from '@/features/tasks/lib/task-status'

export const CASE_CORE_STATUS_LABELS: Record<CaseCoreStatus, string> = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  waiting: 'Wartet',
  completed: 'Abgeschlossen',
  cancelled: 'Abgebrochen',
}

export type CaseTypeLookup = Pick<CaseTypeRecord, 'id' | 'key' | 'label' | 'icon'>
export type BusinessAreaLookup = Pick<BusinessAreaRecord, 'id' | 'key' | 'label'>

export type CaseDisplayLookups = {
  caseTypesById: Record<string, CaseTypeLookup>
  businessAreasById: Record<string, BusinessAreaLookup>
}

export function buildCaseTypeLookup(
  caseTypes: CaseTypeRecord[],
): Record<string, CaseTypeLookup> {
  return Object.fromEntries(
    caseTypes.map((entry) => [
      entry.id,
      {
        id: entry.id,
        key: entry.key,
        label: entry.label,
        icon: entry.icon,
      },
    ]),
  )
}

export function buildBusinessAreaLookup(
  businessAreas: BusinessAreaRecord[],
): Record<string, BusinessAreaLookup> {
  return Object.fromEntries(
    businessAreas.map((entry) => [
      entry.id,
      {
        id: entry.id,
        key: entry.key,
        label: entry.label,
      },
    ]),
  )
}

export function resolveCaseTypeLabel(
  caseTypeId: string,
  caseTypesById: Record<string, CaseTypeLookup>,
): string {
  return caseTypesById[caseTypeId]?.label?.trim() || 'Vorgang'
}

export function resolveCaseTypeKey(
  caseTypeId: string,
  caseTypesById: Record<string, CaseTypeLookup>,
): string | null {
  return caseTypesById[caseTypeId]?.key ?? null
}

export function resolveBusinessAreaLabel(
  businessAreaId: string,
  businessAreasById: Record<string, BusinessAreaLookup>,
): string {
  return businessAreasById[businessAreaId]?.label?.trim() || 'Fachbereich'
}

export function formatCaseCoreStatusLabel(status: string): string {
  if ((CASE_CORE_STATUSES as readonly string[]).includes(status)) {
    return CASE_CORE_STATUS_LABELS[status as CaseCoreStatus]
  }

  return status
}

export function formatCasePriorityLabel(priority: CasePriority): string {
  return TASK_PRIORITY_LABELS[priority] ?? priority
}

export function isCaseOpenForDue(caseRow: CaseRecord): boolean {
  return caseRow.core_status !== 'completed' && caseRow.core_status !== 'cancelled'
}

export function isCaseDueOverdue(
  caseRow: CaseRecord,
  today = getTodayDateString(),
): boolean {
  if (!caseRow.due_at || !isCaseOpenForDue(caseRow)) {
    return false
  }

  return caseRow.due_at < today
}

export function formatCaseDueAtLabel(
  dueAt: string,
  today = getTodayDateString(),
  allowOverdue = true,
): string {
  return formatDueDateLabel(dueAt, today, allowOverdue)
}
