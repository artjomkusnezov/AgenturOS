import type { CaseRecord } from '@/features/cases/types/case'
import type {
  WorkspaceViewFilters,
  WorkspaceViewSort,
} from '@/features/workspace-views/types/workspace-view'
import { getCurrentUserAgency } from '@/features/agency/repositories/agency-repository'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type CaseListResult = { success: true; cases: CaseRecord[] } | RepositoryError

type CaseCountResult = { success: true; count: number } | RepositoryError

type CaseQueryRow = CaseRecord & {
  case_types?: { key: string } | { key: string }[] | null
  business_areas?: { key: string } | { key: string }[] | null
}

function stripJoinFields(row: CaseQueryRow): CaseRecord {
  const { case_types: _caseTypes, business_areas: _businessAreas, ...caseRow } = row
  void _caseTypes
  void _businessAreas
  return caseRow
}

type ListCasesForViewOptions = {
  filters: WorkspaceViewFilters
  sort?: WorkspaceViewSort
  includeArchived?: boolean
}

/**
 * Lädt Cases anhand einer validierten Workspace-View-Filterstruktur.
 * Keine dynamischen SQL-Fragmente – nur kontrollierte Query-Builder-Aufrufe.
 */
export async function listCasesForWorkspaceViewFilters(
  options: ListCasesForViewOptions,
): Promise<CaseListResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const { filters, sort = 'updated_at_desc', includeArchived = false } = options
  const supabase = await createClient()

  let query = supabase
    .from('cases')
    .select('*, case_types!inner(key), business_areas!inner(key)')
    .eq('agency_id', agencyResult.agency.id)

  if (!includeArchived) {
    query = query.is('archived_at', null)
  }

  if (filters.case_type_keys && filters.case_type_keys.length > 0) {
    query = query.in('case_types.key', filters.case_type_keys)
  }

  if (filters.business_area_keys && filters.business_area_keys.length > 0) {
    query = query.in('business_areas.key', filters.business_area_keys)
  }

  if (filters.core_statuses && filters.core_statuses.length > 0) {
    query = query.in('core_status', filters.core_statuses)
  }

  if (filters.assignee_user_id !== undefined) {
    if (filters.assignee_user_id === null) {
      query = query.is('assignee_user_id', null)
    } else {
      query = query.eq('assignee_user_id', filters.assignee_user_id)
    }
  }

  if (filters.due_from) {
    query = query.gte('due_at', filters.due_from)
  }

  if (filters.due_to) {
    query = query.lte('due_at', filters.due_to)
  }

  if (filters.is_overdue === true) {
    query = query
      .lt('due_at', new Date().toISOString())
      .not('core_status', 'in', '(completed,cancelled)')
  }

  if (sort === 'created_at_desc') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'due_at_asc') {
    query = query.order('due_at', { ascending: true })
  } else if (sort === 'priority_desc') {
    query = query.order('priority', { ascending: false })
  } else {
    query = query.order('updated_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    return {
      success: false,
      error: 'Die Vorgänge konnten nicht geladen werden.',
    }
  }

  return {
    success: true,
    cases: data.map((row) => stripJoinFields(row as CaseQueryRow)),
  }
}

export async function countCasesForWorkspaceViewFilters(
  filters: WorkspaceViewFilters,
): Promise<CaseCountResult> {
  const listResult = await listCasesForWorkspaceViewFilters({
    filters,
    sort: 'updated_at_desc',
  })

  if (!listResult.success) {
    return listResult
  }

  return {
    success: true,
    count: listResult.cases.length,
  }
}
