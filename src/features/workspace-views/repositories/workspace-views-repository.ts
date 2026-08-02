import { getCurrentUserAgency } from '@/features/agency/repositories/agency-repository'
import { mapWorkspaceViewRecord } from '@/features/workspace-views/lib/map-workspace-view'
import type {
  WorkspaceView,
  WorkspaceViewNavItem,
} from '@/features/workspace-views/types/workspace-view'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type WorkspaceViewListResult =
  | { success: true; views: WorkspaceView[] }
  | RepositoryError

type WorkspaceViewResult =
  | { success: true; view: WorkspaceView }
  | RepositoryError

type WorkspaceViewNavResult =
  | { success: true; views: WorkspaceViewNavItem[] }
  | RepositoryError

async function listActiveWorkspaceViewsForCurrentAgency(
  options: {
    visibleInNavigation?: boolean
    visibleOnDashboard?: boolean
  } = {},
): Promise<WorkspaceViewListResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  let query = supabase
    .from('workspace_views')
    .select('*')
    .eq('agency_id', agencyResult.agency.id)
    .eq('is_active', true)
    .eq('scope', 'cases')
    .order('sort_order', { ascending: true })

  if (options.visibleInNavigation === true) {
    query = query.eq('visible_in_navigation', true)
  }

  if (options.visibleOnDashboard === true) {
    query = query.eq('visible_on_dashboard', true)
  }

  const { data, error } = await query

  if (error) {
    return {
      success: false,
      error: 'Die Arbeitsansichten konnten nicht geladen werden.',
    }
  }

  const views = data
    .map((row) => mapWorkspaceViewRecord(row))
    .filter((view): view is WorkspaceView => view !== null)

  return {
    success: true,
    views,
  }
}

export async function listActiveWorkspaceViews(): Promise<WorkspaceViewListResult> {
  return listActiveWorkspaceViewsForCurrentAgency()
}

export async function listNavigationWorkspaceViews(): Promise<WorkspaceViewNavResult> {
  const result = await listActiveWorkspaceViewsForCurrentAgency({
    visibleInNavigation: true,
  })

  if (!result.success) {
    return result
  }

  return {
    success: true,
    views: result.views.map((view) => ({
      id: view.id,
      key: view.key,
      name: view.name,
      icon: view.icon,
      sort_order: view.sort_order,
    })),
  }
}

export async function listDashboardWorkspaceViews(): Promise<WorkspaceViewListResult> {
  return listActiveWorkspaceViewsForCurrentAgency({
    visibleOnDashboard: true,
  })
}

export async function getWorkspaceViewByKeyForCurrentAgency(
  key: string,
): Promise<WorkspaceViewResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspace_views')
    .select('*')
    .eq('agency_id', agencyResult.agency.id)
    .eq('key', key)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Arbeitsansicht konnte nicht geladen werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Arbeitsansicht wurde nicht gefunden.',
    }
  }

  const view = mapWorkspaceViewRecord(data)

  if (!view) {
    return {
      success: false,
      error: 'Die Arbeitsansicht ist ungültig.',
    }
  }

  return {
    success: true,
    view,
  }
}

export async function getWorkspaceViewByIdForCurrentAgency(
  id: string,
): Promise<WorkspaceViewResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspace_views')
    .select('*')
    .eq('agency_id', agencyResult.agency.id)
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Arbeitsansicht konnte nicht geladen werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Arbeitsansicht wurde nicht gefunden.',
    }
  }

  const view = mapWorkspaceViewRecord(data)

  if (!view) {
    return {
      success: false,
      error: 'Die Arbeitsansicht ist ungültig.',
    }
  }

  return {
    success: true,
    view,
  }
}
