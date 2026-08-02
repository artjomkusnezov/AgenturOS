'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import { AppNavIconGlyph } from '@/components/app/app-icons'
import {
  appNavigationGroups,
  isCaseViewNavActive,
  isNavItemActive,
  type AppCaseViewNavItem,
  type AppNavItem,
} from '@/config/app-navigation'
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
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: AppNavItem
  pathname: string
  onNavigate?: () => void
}) {
  const isActive = isNavItemActive(pathname, item.href)

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={`${aosNavLinkClassName} ${isActive ? aosNavLinkActiveClassName : 'hover:bg-zinc-50 hover:text-zinc-900'}`}
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
      <span>{item.title}</span>
    </Link>
  )
}

function CaseViewNavLink({
  item,
  pathname,
  searchParams,
  onNavigate,
}: {
  item: AppCaseViewNavItem
  pathname: string
  searchParams: URLSearchParams
  onNavigate?: () => void
}) {
  const isActive = isCaseViewNavActive(pathname, searchParams, item.key)
  const icon = resolveWorkspaceViewNavIcon(item.icon)

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={`${aosNavLinkClassName} pl-9 ${isActive ? aosNavLinkActiveClassName : 'hover:bg-zinc-50 hover:text-zinc-900'}`}
    >
      {isActive ? (
        <span aria-hidden="true" className={aosNavLinkIndicatorClassName} />
      ) : null}
      <AppNavIconGlyph
        icon={icon}
        className={`h-4 w-4 shrink-0 ${isActive ? 'text-accent' : 'text-zinc-500'}`}
      />
      <span>{item.name}</span>
    </Link>
  )
}

export function AppNavigation({
  onNavigate,
  id,
  caseViews = [],
}: AppNavigationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

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
                  onNavigate={onNavigate}
                />
                {item.href === '/app/cases' && caseViews.length > 0
                  ? caseViews.map((view) => (
                      <CaseViewNavLink
                        key={view.key}
                        item={view}
                        pathname={pathname}
                        searchParams={searchParams}
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
