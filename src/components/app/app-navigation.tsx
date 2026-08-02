'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import { AppNavIconGlyph } from '@/components/app/app-icons'
import { NavigationBadge } from '@/components/app/navigation-badge'
import {
  appNavigationGroups,
  isCaseViewNavActive,
  isNavItemActive,
  type AppCaseViewNavItem,
  type AppNavItem,
} from '@/config/app-navigation'
import {
  getCaseViewNavBadge,
  getMainNavBadge,
} from '@/features/navigation/lib/navigation-badge-display'
import {
  EMPTY_NAVIGATION_BADGE_COUNTS,
  type NavigationBadgeCounts,
} from '@/features/navigation/types/navigation-badges'
import { resolveWorkspaceViewNavIcon } from '@/features/workspace-views/lib/workspace-view-icons'
import {
  aosNavGroupLabelClassName,
  aosNavLinkActiveClassName,
  aosNavLinkClassName,
  aosNavLinkIndicatorClassName,
} from '@/lib/design-system'

type AppNavigationProps = {
  onNavigate?: () => void
  id?: string
  caseViews?: AppCaseViewNavItem[]
  badgeCounts?: NavigationBadgeCounts
}

function NavLink({
  item,
  pathname,
  badgeCounts,
  onNavigate,
}: {
  item: AppNavItem
  pathname: string
  badgeCounts: NavigationBadgeCounts
  onNavigate?: () => void
}) {
  const isActive = isNavItemActive(pathname, item.href)
  const badge = getMainNavBadge(item.href, badgeCounts)

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={`${aosNavLinkClassName} w-full ${isActive ? aosNavLinkActiveClassName : 'hover:bg-zinc-50 hover:text-zinc-900'}`}
    >
      {isActive ? (
        <span aria-hidden="true" className={aosNavLinkIndicatorClassName} />
      ) : null}
      <AppNavIconGlyph
        icon={item.icon}
        className={`h-[1.125rem] w-[1.125rem] shrink-0 ${
          isActive ? 'text-accent' : 'text-zinc-500'
        }`}
      />
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {badge ? (
        <NavigationBadge count={badge.count} tone={badge.tone} label={badge.label} />
      ) : null}
    </Link>
  )
}

function CaseViewNavLink({
  item,
  pathname,
  searchParams,
  badgeCounts,
  onNavigate,
}: {
  item: AppCaseViewNavItem
  pathname: string
  searchParams: URLSearchParams
  badgeCounts: NavigationBadgeCounts
  onNavigate?: () => void
}) {
  const isActive = isCaseViewNavActive(pathname, searchParams, item.key)
  const icon = resolveWorkspaceViewNavIcon(item.icon)
  const badge = getCaseViewNavBadge(item.key, item.name, badgeCounts)

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={`${aosNavLinkClassName} w-full pl-9 ${isActive ? aosNavLinkActiveClassName : 'hover:bg-zinc-50 hover:text-zinc-900'}`}
    >
      {isActive ? (
        <span aria-hidden="true" className={aosNavLinkIndicatorClassName} />
      ) : null}
      <AppNavIconGlyph
        icon={icon}
        className={`h-4 w-4 shrink-0 ${isActive ? 'text-accent' : 'text-zinc-500'}`}
      />
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      {badge ? (
        <NavigationBadge count={badge.count} tone={badge.tone} label={badge.label} />
      ) : null}
    </Link>
  )
}

export function AppNavigation({
  onNavigate,
  id,
  caseViews = [],
  badgeCounts,
}: AppNavigationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const counts = badgeCounts ?? EMPTY_NAVIGATION_BADGE_COUNTS

  return (
    <nav id={id} aria-label="Hauptnavigation" className="flex flex-col gap-0.5">
      {appNavigationGroups.map((group) => (
        <div key={group.label}>
          <p className={aosNavGroupLabelClassName}>{group.label}</p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <div key={item.href} className="flex flex-col gap-0.5">
                <NavLink
                  item={item}
                  pathname={pathname}
                  badgeCounts={counts}
                  onNavigate={onNavigate}
                />
                {item.href === '/app/cases' && caseViews.length > 0
                  ? caseViews.map((view) => (
                      <CaseViewNavLink
                        key={view.key}
                        item={view}
                        pathname={pathname}
                        searchParams={searchParams}
                        badgeCounts={counts}
                        onNavigate={onNavigate}
                      />
                    ))
                  : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
