'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { AppNavIconGlyph } from '@/components/app/app-icons'
import {
  appNavigationGroups,
  isNavItemActive,
  type AppNavItem,
} from '@/config/app-navigation'
import {
  aosNavGroupLabelClassName,
  aosNavLinkActiveClassName,
  aosNavLinkClassName,
  aosNavLinkIndicatorClassName,
} from '@/lib/design-system'

type AppNavigationProps = {
  onNavigate?: () => void
  id?: string
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

export function AppNavigation({ onNavigate, id }: AppNavigationProps) {
  const pathname = usePathname()

  return (
    <nav id={id} aria-label="Hauptnavigation" className="flex flex-col gap-0.5">
      {appNavigationGroups.map((group) => (
        <div key={group.label}>
          <p className={aosNavGroupLabelClassName}>{group.label}</p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
