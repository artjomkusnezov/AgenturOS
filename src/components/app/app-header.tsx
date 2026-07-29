'use client'

import { usePathname } from 'next/navigation'

import { BellIcon, MenuIcon, SearchIcon } from '@/components/app/app-icons'
import { getNavItemByPathname } from '@/config/app-navigation'
import { LogoutButton } from '@/features/auth/components/logout-button'

type AppHeaderProps = {
  onOpenMobileMenu: () => void
  userDisplayName: string
}

export function AppHeader({ onOpenMobileMenu, userDisplayName }: AppHeaderProps) {
  const pathname = usePathname()
  const currentNav = getNavItemByPathname(pathname)

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Menü öffnen"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 lg:hidden"
        >
          <MenuIcon />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-zinc-900">
            {currentNav?.title ?? 'AgenturOS'}
          </h1>
          {currentNav?.description ? (
            <p className="hidden truncate text-sm text-zinc-500 sm:block">
              {currentNav.description}
            </p>
          ) : null}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <div
            aria-hidden="true"
            title="Globale Suche folgt in einem späteren Schritt"
            className="inline-flex h-10 min-w-[12rem] items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-400"
          >
            <SearchIcon className="h-4 w-4" />
            Suche folgt
          </div>
          <div
            aria-hidden="true"
            title="Benachrichtigungen folgen in einem späteren Schritt"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-400"
          >
            <BellIcon className="h-4 w-4" />
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <span className="max-w-[12rem] truncate text-sm text-zinc-600">
            {userDisplayName}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
