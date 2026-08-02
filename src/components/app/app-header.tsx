'use client'

import { MenuIcon } from '@/components/app/app-icons'
import {
  aosAppHeaderClassName,
  aosIconButtonClassName,
  aosTextSmallClassName,
} from '@/lib/design-system'

type AppHeaderProps = {
  onOpenMobileMenu: () => void
}

export function AppHeader({ onOpenMobileMenu }: AppHeaderProps) {
  return (
    <header className={`${aosAppHeaderClassName} lg:hidden`}>
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Menü öffnen"
        className={`${aosIconButtonClassName} -ml-1`}
      >
        <MenuIcon className="h-[1.125rem] w-[1.125rem]" />
      </button>

      <p className={`min-w-0 flex-1 truncate ${aosTextSmallClassName} font-semibold text-zinc-900`}>
        AgenturOS
      </p>
    </header>
  )
}
