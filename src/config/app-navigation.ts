export type AppNavIcon =
  | 'overview'
  | 'inbox'
  | 'tasks'
  | 'leads'
  | 'information'
  | 'contacts'
  | 'files'
  | 'activity'
  | 'analytics'
  | 'checklist'
  | 'settings'

export type AppNavItem = {
  title: string
  href: string
  icon: AppNavIcon
  description?: string
}

export type AppNavGroup = {
  label: string
  items: AppNavItem[]
}

export type AppCaseViewNavItem = {
  key: string
  name: string
  icon: string | null
  href: string
}

/** Feste Hauptnavigation (ohne dynamische Case-Views). */
export const appNavigationGroups: AppNavGroup[] = [
  {
    label: 'Arbeit',
    items: [
      {
        title: 'Übersicht',
        href: '/app',
        icon: 'overview',
        description: 'Ihr persönlicher Überblick für den Tag.',
      },
      {
        title: 'Eingang',
        href: '/app/inbox',
        icon: 'inbox',
        description: 'Zentraler Eingang für erfasste Inhalte.',
      },
      {
        title: 'Kfz-Messung',
        href: '/app/kfz-analytics',
        icon: 'analytics',
        description: 'Anonyme Nutzung der öffentlichen Kfz-Strecke.',
      },
      {
        title: 'Kfz-Startcheck',
        href: '/app/kfz-readiness',
        icon: 'checklist',
        description: 'Eine Antwort zur Startlage — keine Produktionsfreigabe.',
      },
      {
        title: 'Vorgänge',
        href: '/app/cases',
        icon: 'tasks',
        description: 'Vorgänge erfassen, organisieren und bearbeiten.',
      },
      {
        title: 'Informationen',
        href: '/app/information',
        icon: 'information',
        description: 'Zentrale Informationsablage Ihrer Agentur.',
      },
    ],
  },
  {
    label: 'Organisation',
    items: [
      {
        title: 'Kontakte',
        href: '/app/contacts',
        icon: 'contacts',
        description: 'Personen und Firmen verwalten.',
      },
      {
        title: 'Dateien',
        href: '/app/files',
        icon: 'files',
        description: 'Dateien hochladen und verwalten.',
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        title: 'Aktivitäten',
        href: '/app/activity',
        icon: 'activity',
        description: 'Verlauf wichtiger Vorgänge.',
      },
      {
        title: 'Einstellungen',
        href: '/app/settings',
        icon: 'settings',
        description: 'Persönliche und anwendungsbezogene Einstellungen.',
      },
    ],
  },
]

export const appNavigation: AppNavItem[] = appNavigationGroups.flatMap(
  (group) => group.items,
)

export const LEADS_NAV_HREF = '/app/leads' as const

export const LEADS_NAV_ITEM: AppNavItem = {
  title: 'Leads',
  href: LEADS_NAV_HREF,
  icon: 'leads',
  description: 'Kfz-Anfragen qualifizieren und bearbeiten — ohne stillen Vorgang.',
}

export const LEADS_CASE_VIEW_NAV: AppCaseViewNavItem = {
  key: 'leads',
  name: 'Leads',
  icon: 'leads',
  href: LEADS_NAV_HREF,
}

function pathEqualsOrNested(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function isLeadsPathname(pathname: string): boolean {
  return pathEqualsOrNested(pathname, LEADS_NAV_HREF)
}

export function isTasksPathname(pathname: string): boolean {
  return pathEqualsOrNested(pathname, '/app/tasks')
}

export function isOverviewNavHref(href: string): boolean {
  return href === '/app'
}

/** Leads is always the first child under Vorgänge. Case views follow unchanged. */
export function buildVorgaengeChildNavItems(
  caseViews: AppCaseViewNavItem[],
  resolveHref: (href: string) => string = (href) => href,
): AppCaseViewNavItem[] {
  const leads: AppCaseViewNavItem = {
    ...LEADS_CASE_VIEW_NAV,
    href: resolveHref(LEADS_NAV_HREF),
  }
  const rest = caseViews.filter((view) => view.key !== 'leads').map((view) => ({
    ...view,
    href: resolveHref(view.href),
  }))
  return [leads, ...rest]
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (isOverviewNavHref(href)) {
    return pathname === href
  }

  // Nested children under Vorgänge carry their own chrome — never the parent.
  if (href === '/app/cases') {
    if (isTasksPathname(pathname) || isLeadsPathname(pathname)) {
      return false
    }
    return pathEqualsOrNested(pathname, '/app/cases')
  }

  return pathEqualsOrNested(pathname, href)
}

export function getNavItemByPathname(pathname: string): AppNavItem | undefined {
  if (isLeadsPathname(pathname)) {
    return LEADS_NAV_ITEM
  }

  // Alias-Route: Seititel bleibt bei Vorgänge; Active State der Kind-View separat.
  if (isTasksPathname(pathname)) {
    return appNavigation.find((item) => item.href === '/app/cases')
  }

  return appNavigation.find((item) => isNavItemActive(pathname, item.href))
}

export function isCaseViewNavActive(
  pathname: string,
  _searchParams: URLSearchParams,
  viewKey: string,
): boolean {
  if (isLeadsPathname(pathname)) {
    return viewKey === 'leads'
  }

  // Dedicated alias route: only nested "Aufgaben" carries the active chrome.
  if (isTasksPathname(pathname)) {
    return viewKey === 'tasks'
  }

  // On /app/cases (any ?view=), only parent "Vorgänge" is active — never children.
  return false
}
