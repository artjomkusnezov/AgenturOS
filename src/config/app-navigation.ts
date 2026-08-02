export type AppNavIcon =
  | 'overview'
  | 'inbox'
  | 'tasks'
  | 'information'
  | 'contacts'
  | 'files'
  | 'activity'
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

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/app') {
    return pathname === '/app'
  }

  if (href === '/app/cases') {
    return (
      pathname === '/app/cases'
      || pathname.startsWith('/app/cases/')
      || pathname === '/app/tasks'
      || pathname.startsWith('/app/tasks/')
    )
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function getNavItemByPathname(pathname: string): AppNavItem | undefined {
  return appNavigation.find((item) => isNavItemActive(pathname, item.href))
}

export function isCaseViewNavActive(
  pathname: string,
  searchParams: URLSearchParams,
  viewKey: string,
): boolean {
  if (pathname === '/app/tasks' || pathname.startsWith('/app/tasks/')) {
    return viewKey === 'tasks'
  }

  if (pathname !== '/app/cases' && !pathname.startsWith('/app/cases/')) {
    return false
  }

  const currentView = searchParams.get('view') || 'tasks'
  return currentView === viewKey
}
