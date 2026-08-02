import { isSystemCaseTypeKey } from '@/features/cases/types/case'
import {
  WORKSPACE_VIEW_SORT_OPTIONS,
  type WorkspaceViewFilters,
  type WorkspaceViewSort,
} from '@/features/workspace-views/types/workspace-view'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asStringArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    return undefined
  }

  if (!value.every((entry) => typeof entry === 'string')) {
    return undefined
  }

  return value
}

function asOptionalIsoDate(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    return undefined
  }

  return value
}

/**
 * Validiert und normalisiert Filter aus der DB.
 * Unbekannte Keys werden verworfen. Ungültige Werte → null (ablehnen).
 */
export function normalizeWorkspaceViewFilters(
  raw: unknown,
): WorkspaceViewFilters | null {
  if (raw === null || raw === undefined) {
    return {}
  }

  if (!isPlainObject(raw)) {
    return null
  }

  const filters: WorkspaceViewFilters = {}

  if ('case_type_keys' in raw) {
    const values = asStringArray(raw.case_type_keys)
    if (values === undefined) {
      return null
    }

    if (!values.every(isSystemCaseTypeKey)) {
      return null
    }

    filters.case_type_keys = values
  }

  if ('business_area_keys' in raw) {
    const values = asStringArray(raw.business_area_keys)
    if (values === undefined) {
      return null
    }

    if (!values.every((key) => key.trim() !== '')) {
      return null
    }

    filters.business_area_keys = values
  }

  if ('core_statuses' in raw) {
    const values = asStringArray(raw.core_statuses)
    if (values === undefined) {
      return null
    }

    if (!values.every((status) => status.trim() !== '')) {
      return null
    }

    filters.core_statuses = values
  }

  if ('assignee_user_id' in raw) {
    const value = raw.assignee_user_id
    if (value === null) {
      filters.assignee_user_id = null
    } else if (typeof value === 'string' && UUID_PATTERN.test(value)) {
      filters.assignee_user_id = value
    } else {
      return null
    }
  }

  if ('due_from' in raw) {
    const value = asOptionalIsoDate(raw.due_from)
    if (value === undefined) {
      return null
    }
    filters.due_from = value
  }

  if ('due_to' in raw) {
    const value = asOptionalIsoDate(raw.due_to)
    if (value === undefined) {
      return null
    }
    filters.due_to = value
  }

  if ('is_overdue' in raw) {
    if (typeof raw.is_overdue !== 'boolean') {
      return null
    }
    filters.is_overdue = raw.is_overdue
  }

  return filters
}

export function isWorkspaceViewSort(value: string): value is WorkspaceViewSort {
  return (WORKSPACE_VIEW_SORT_OPTIONS as readonly string[]).includes(value)
}

export function normalizeWorkspaceViewSort(raw: unknown): WorkspaceViewSort {
  if (typeof raw === 'string' && isWorkspaceViewSort(raw)) {
    return raw
  }

  return 'updated_at_desc'
}
