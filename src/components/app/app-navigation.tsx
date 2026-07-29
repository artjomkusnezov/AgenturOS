'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { AppNavIconGlyph } from '@/components/app/app-icons'
import {
  appNavigation,
  isNavItemActive,
  type AppNavItem,
} from '@/config/app-navigation'

type AppNavigationProps = {
  onNavigate?: () => void
  id?: string
}

function NavLink({ item, pathname, onNavigate }: {
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
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        isActive
          ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80'
          : 'text-zinc-600 hover:bg-zinc-200/45 hover:text-zinc-900'
      }`}
    >
      {isActive ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent"
        />
      ) : null}
      <AppNavIconGlyph
        icon={item.icon}
        className={`h-[1.125rem] w-[1.125rem] shrink-0 transition-colors duration-150 ${
          isActive ? 'text-accent' : 'text-zinc-400 group-hover:text-zinc-600'
        }`}
      />
      <span>{item.title}</span>
    </Link>
  )
}

export function AppNavigation({ onNavigate, id }: AppNavigationProps) {
  const pathname = usePathname()

  return (
    <nav id={id} aria-label="Hauptnavigation" className="flex flex-col gap-1 px-1">
      {appNavigation.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}
