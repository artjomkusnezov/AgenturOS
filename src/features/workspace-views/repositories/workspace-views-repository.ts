import { cache } from 'react'

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

/** Primitive args so React `cache()` can dedupe within a request. */
const listActiveWorkspaceViewsCached = cache(
  async function listActiveWorkspaceViewsCached(
    visibleInNavigation: 0 | 1,
    visibleOnDashboard: 0 | 1,
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

    if (visibleInNavigation === 1) {
      query = query.eq('visible_in_navigation', true)
    }

    if (visibleOnDashboard === 1) {
      query = query.eq('visible_on_dashboard', true)
    }

    const { data, error } = await query

    if (error) {
      return {
        success: false,
        error: 'Die Arbeitsansichten konnten nicht geladen werden.',
      }
    }

    const rows = data ?? []
    const views = rows
      .map((row) => mapWorkspaceViewRecord(row))
      .filter((view): view is WorkspaceView => view !== null)

    // Auth/RLS flakes often return [] while agency resolve still succeeded.
    // Do not present that as “no views configured”.
    if (views.length === 0 && rows.length === 0) {
      return {
        success: false,
        error:
          'Die Arbeitsansichten konnten nicht geladen werden. Bitte die Seite neu laden.',
      }
    }

    if (views.length === 0 && rows.length > 0) {
      return {
        success: false,
        error: 'Die Arbeitsansichten sind ungültig konfiguriert.',
      }
    }

    return {
      success: true,
      views,
    }
  },
)

export async function listActiveWorkspaceViews(): Promise<WorkspaceViewListResult> {
  return listActiveWorkspaceViewsCached(0, 0)
}

export async function listNavigationWorkspaceViews(): Promise<WorkspaceViewNavResult> {
  const result = await listActiveWorkspaceViewsCached(1, 0)

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
  return listActiveWorkspaceViewsCached(0, 1)
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
