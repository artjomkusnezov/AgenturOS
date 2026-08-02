import type { WorkspaceViewRecord } from '@/features/workspace-views/types/workspace-view'
import type { WorkspaceView } from '@/features/workspace-views/types/workspace-view'
import {
  normalizeWorkspaceViewFilters,
  normalizeWorkspaceViewSort,
} from '@/features/workspace-views/lib/validate-workspace-view-filters'

export function mapWorkspaceViewRecord(
  row: WorkspaceViewRecord,
): WorkspaceView | null {
  if (row.scope !== 'cases') {
    return null
  }

  const filters = normalizeWorkspaceViewFilters(row.filters)
  if (!filters) {
    return null
  }

  return {
    id: row.id,
    agency_id: row.agency_id,
    key: row.key,
    name: row.name,
    icon: row.icon,
    scope: 'cases',
    filters,
    sort: normalizeWorkspaceViewSort(row.sort),
    visible_in_navigation: row.visible_in_navigation,
    visible_on_dashboard: row.visible_on_dashboard,
    sort_order: row.sort_order,
    is_active: row.is_active,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
