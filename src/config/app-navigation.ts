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

export const appNavigation: AppNavItem[] = [
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
    description: 'Zentraler Eingang für erfasste Inhalte, die später eingeordnet werden.',
  },
  {
    title: 'Aufgaben',
    href: '/app/tasks',
    icon: 'tasks',
    description: 'Hier werden später Aufgaben erfasst, organisiert und bearbeitet.',
  },
  {
    title: 'Informationen',
    href: '/app/information',
    icon: 'information',
    description: 'Hier entsteht die zentrale Informationsablage von AgenturOS.',
  },
  {
    title: 'Kontakte',
    href: '/app/contacts',
    icon: 'contacts',
    description: 'Hier werden Kontakte erfasst und verwaltet.',
  },
  {
    title: 'Dateien',
    href: '/app/files',
    icon: 'files',
    description: 'Hier werden später Dateien und Dokumente übersichtlich verwaltet.',
  },
  {
    title: 'Aktivitäten',
    href: '/app/activity',
    icon: 'activity',
    description: 'Hier wird später der Verlauf wichtiger Vorgänge sichtbar.',
  },
  {
    title: 'Einstellungen',
    href: '/app/settings',
    icon: 'settings',
    description:
      'Hier werden später persönliche und anwendungsbezogene Einstellungen verwaltet.',
  },
]

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/app') {
    return pathname === '/app'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function getNavItemByPathname(pathname: string): AppNavItem | undefined {
  return appNavigation.find((item) => isNavItemActive(pathname, item.href))
}
