import { getCurrentUserAgency } from '@/features/agency/repositories/agency-repository'
import { isValidInformationItemId } from '@/features/information/lib/validate-information-item'
import type { InformationItem } from '@/features/information/types/information-item'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type ListCaseInformationResult =
  | {
      success: true
      items: Array<{
        relationId: string
        linkedAt: string
        information: InformationItem
      }>
    }
  | RepositoryError

type RelationMutationResult = { success: true } | RepositoryError

function isValidCaseId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

/**
 * Vorbereitete Case↔Knowledge-APIs (30G).
 * Noch nicht an die UI angebunden — Tasks nutzen weiterhin task_information_relations.
 */
export async function listInformationForCase(
  caseId: string,
): Promise<ListCaseInformationResult> {
  if (!isValidCaseId(caseId)) {
    return {
      success: false,
      error: 'Bitte geben Sie einen gültigen Vorgang an.',
    }
  }

  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('case_information_relations')
    .select('id, created_at, information_items(*)')
    .eq('case_id', caseId)
    .eq('agency_id', agencyResult.agency.id)
    .order('created_at', { ascending: true })

  if (error) {
    return {
      success: false,
      error: 'Die verknüpften Informationen konnten nicht geladen werden.',
    }
  }

  const items: Array<{
    relationId: string
    linkedAt: string
    information: InformationItem
  }> = []

  for (const row of data) {
    const information = row.information_items
    if (!information || Array.isArray(information)) {
      continue
    }

    items.push({
      relationId: row.id,
      linkedAt: row.created_at,
      information,
    })
  }

  return {
    success: true,
    items,
  }
}

export async function attachInformationToCase(
  caseId: string,
  informationId: string,
): Promise<RelationMutationResult> {
  if (!isValidCaseId(caseId)) {
    return {
      success: false,
      error: 'Bitte geben Sie einen gültigen Vorgang an.',
    }
  }

  if (!isValidInformationItemId(informationId)) {
    return {
      success: false,
      error: 'Bitte geben Sie eine gültige Information an.',
    }
  }

  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'Sie sind nicht angemeldet.',
    }
  }

  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .select('id, agency_id')
    .eq('id', caseId)
    .eq('agency_id', agencyResult.agency.id)
    .maybeSingle()

  if (caseError || !caseRow) {
    return {
      success: false,
      error: 'Der Vorgang wurde nicht gefunden.',
    }
  }

  const { data: informationRow, error: informationError } = await supabase
    .from('information_items')
    .select('id, agency_id')
    .eq('id', informationId)
    .eq('agency_id', agencyResult.agency.id)
    .maybeSingle()

  if (informationError || !informationRow) {
    return {
      success: false,
      error: 'Die Information wurde nicht gefunden.',
    }
  }

  const { error } = await supabase.from('case_information_relations').insert({
    agency_id: caseRow.agency_id,
    case_id: caseId,
    information_id: informationId,
    created_by: user.id,
  })

  if (error) {
    if (error.code === '23505') {
      return {
        success: false,
        error: 'Diese Information ist bereits verknüpft.',
      }
    }

    return {
      success: false,
      error: 'Die Information konnte nicht verknüpft werden.',
    }
  }

  return {
    success: true,
  }
}

export async function detachInformationFromCase(
  caseId: string,
  informationId: string,
): Promise<RelationMutationResult> {
  if (!isValidCaseId(caseId)) {
    return {
      success: false,
      error: 'Bitte geben Sie einen gültigen Vorgang an.',
    }
  }

  if (!isValidInformationItemId(informationId)) {
    return {
      success: false,
      error: 'Bitte geben Sie eine gültige Information an.',
    }
  }

  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('case_information_relations')
    .delete()
    .eq('case_id', caseId)
    .eq('information_id', informationId)
    .eq('agency_id', agencyResult.agency.id)
    .select('id')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Verknüpfung konnte nicht entfernt werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Verknüpfung wurde nicht gefunden.',
    }
  }

  return {
    success: true,
  }
}
