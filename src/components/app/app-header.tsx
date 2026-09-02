'use client'

import { MenuIcon } from '@/components/app/app-icons'
import {
  aosAppHeaderClassName,
  aosIconButtonClassName,
  aosTextSmallClassName,
} from '@/lib/design-system'

type AppHeaderProps = {
  onOpenMobileMenu: () => void
  variant?: 'default' | 'agenturzentrale'
}

export function AppHeader({ onOpenMobileMenu, variant = 'default' }: AppHeaderProps) {
  const isDark = variant === 'agenturzentrale'

  return (
    <header
      className={`${aosAppHeaderClassName} lg:hidden ${
        isDark ? 'border-[var(--az-border-subtle)] bg-[var(--az-bg-shell)]' : ''
      }`}
    >
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Menü öffnen"
        className={`${aosIconButtonClassName} -ml-1 ${
          isDark ? 'text-[var(--az-text-primary)] hover:bg-white/[0.06]' : ''
        }`}
      >
        <MenuIcon className="h-[1.125rem] w-[1.125rem]" />
      </button>

      <p
        className={`min-w-0 flex-1 truncate ${aosTextSmallClassName} font-semibold ${
          isDark ? 'text-[var(--az-text-primary)]' : 'text-zinc-900'
        }`}
      >
        AgenturOS
      </p>
    </header>
  )
}
