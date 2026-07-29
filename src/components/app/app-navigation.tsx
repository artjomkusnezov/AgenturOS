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
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
        isActive
          ? 'bg-zinc-900 text-white'
          : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
      }`}
    >
      <AppNavIconGlyph icon={item.icon} />
      <span>{item.title}</span>
    </Link>
  )
}

export function AppNavigation({ onNavigate, id }: AppNavigationProps) {
  const pathname = usePathname()

  return (
    <nav id={id} aria-label="Hauptnavigation" className="flex flex-col gap-1">
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
