import type {
  BusinessAreaRecord,
  CaseRecord,
  CaseTypeRecord,
} from '@/features/cases/types/case'
import { getCurrentUserAgency } from '@/features/agency/repositories/agency-repository'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type CaseResult = { success: true; case: CaseRecord } | RepositoryError

type CaseListResult = { success: true; cases: CaseRecord[] } | RepositoryError

type CaseTypeListResult =
  | { success: true; caseTypes: CaseTypeRecord[] }
  | RepositoryError

type BusinessAreaListResult =
  | { success: true; businessAreas: BusinessAreaRecord[] }
  | RepositoryError

type MirrorIntegrityResult =
  | {
      success: true
      taskCount: number
      mirroredCaseCount: number
      difference: number
    }
  | RepositoryError

async function getAuthenticatedUserId(): Promise<
  { success: true; userId: string } | RepositoryError
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      success: false,
      error: 'Sie sind nicht angemeldet.',
    }
  }

  return {
    success: true,
    userId: user.id,
  }
}

export async function getCaseByIdForCurrentUser(
  caseId: string,
): Promise<CaseResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Der Vorgang konnte nicht geladen werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Der Vorgang wurde nicht gefunden.',
    }
  }

  return {
    success: true,
    case: data,
  }
}

export async function getCaseBySourceTaskIdForCurrentUser(
  taskId: string,
): Promise<CaseResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('source_task_id', taskId)
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Der Vorgang konnte nicht geladen werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Der Vorgang wurde nicht gefunden.',
    }
  }

  return {
    success: true,
    case: data,
  }
}

type ListCasesOptions = {
  caseTypeId?: string
  coreStatus?: string
}

export async function listCasesForCurrentAgency(
  options: ListCasesOptions = {},
): Promise<CaseListResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  let query = supabase
    .from('cases')
    .select('*')
    .eq('agency_id', agencyResult.agency.id)
    .order('updated_at', { ascending: false })

  if (options.caseTypeId) {
    query = query.eq('case_type_id', options.caseTypeId)
  }

  if (options.coreStatus) {
    query = query.eq('core_status', options.coreStatus)
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
    cases: data,
  }
}

export async function listActiveCaseTypesForCurrentUser(): Promise<CaseTypeListResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('case_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return {
      success: false,
      error: 'Die Vorgangstypen konnten nicht geladen werden.',
    }
  }

  return {
    success: true,
    caseTypes: data,
  }
}

export async function listActiveBusinessAreasForCurrentAgency(): Promise<BusinessAreaListResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('business_areas')
    .select('*')
    .eq('agency_id', agencyResult.agency.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return {
      success: false,
      error: 'Die Fachbereiche konnten nicht geladen werden.',
    }
  }

  return {
    success: true,
    businessAreas: data,
  }
}

/**
 * Technische Integritätsprüfung Task↔Case-Mirror (nur serverseitig).
 * Keine UI.
 */
export async function getTaskCaseMirrorIntegrityForCurrentAgency(): Promise<MirrorIntegrityResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const agencyId = agencyResult.agency.id

  const [tasksResult, casesResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId),
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .not('source_task_id', 'is', null),
  ])

  if (tasksResult.error || casesResult.error) {
    return {
      success: false,
      error: 'Die Mirror-Integrität konnte nicht geprüft werden.',
    }
  }

  const taskCount = tasksResult.count ?? 0
  const mirroredCaseCount = casesResult.count ?? 0

  return {
    success: true,
    taskCount,
    mirroredCaseCount,
    difference: taskCount - mirroredCaseCount,
  }
}
