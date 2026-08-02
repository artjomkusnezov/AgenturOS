import type { AppNavIcon } from '@/config/app-navigation'

/** Kontrollierte Icon-Keys für Workspace Views (DB → Glyph). */
export type WorkspaceViewIconKey =
  | 'tasks'
  | 'offer'
  | 'claim'
  | 'follow_up'
  | 'mortgage'
  | 'cases'
  | 'appointment'
  | 'contract'
  | 'general'

const WORKSPACE_VIEW_ICON_TO_NAV: Record<WorkspaceViewIconKey, AppNavIcon> = {
  tasks: 'tasks',
  offer: 'files',
  claim: 'activity',
  follow_up: 'inbox',
  mortgage: 'contacts',
  cases: 'tasks',
  appointment: 'activity',
  contract: 'information',
  general: 'tasks',
}

export function resolveWorkspaceViewNavIcon(
  icon: string | null | undefined,
): AppNavIcon {
  if (icon && icon in WORKSPACE_VIEW_ICON_TO_NAV) {
    return WORKSPACE_VIEW_ICON_TO_NAV[icon as WorkspaceViewIconKey]
  }

  return 'tasks'
}

export function getWorkspaceViewEmptyMessage(viewKey: string, viewName: string): string {
  switch (viewKey) {
    case 'tasks':
      return 'Noch keine offenen Aufgaben.'
    case 'offers':
      return 'Noch keine offenen Angebote.'
    case 'claims':
      return 'Noch keine offenen Schäden.'
    case 'follow-ups':
      return 'Noch keine offenen Wiedervorlagen.'
    case 'mortgage':
      return 'Noch keine offenen Baufinanzierungen.'
    default:
      return `Noch keine Einträge in „${viewName}“.`
  }
}
