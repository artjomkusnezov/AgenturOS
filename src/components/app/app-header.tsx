'use client'

import { usePathname } from 'next/navigation'

import { BellIcon, MenuIcon, SearchIcon } from '@/components/app/app-icons'
import { QuickCaptureButton } from '@/components/app/quick-capture-button'
import { getNavItemByPathname } from '@/config/app-navigation'
import { LogoutButton } from '@/features/auth/components/logout-button'

type AppHeaderProps = {
  onOpenMobileMenu: () => void
  userDisplayName: string
  onOpenCapture: () => void
  captureTriggerRef: React.RefObject<HTMLButtonElement | null>
}

const iconButtonStyles =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const logoutButtonStyles =
  '[&_form_button]:rounded-xl [&_form_button]:border [&_form_button]:border-zinc-200/80 [&_form_button]:bg-white [&_form_button]:px-3 [&_form_button]:py-1.5 [&_form_button]:text-sm [&_form_button]:font-medium [&_form_button]:text-zinc-600 [&_form_button]:transition-colors [&_form_button]:duration-150 [&_form_button]:hover:border-zinc-300 [&_form_button]:hover:bg-zinc-50 [&_form_button]:hover:text-zinc-900 [&_form_button]:focus-visible:outline [&_form_button]:focus-visible:outline-2 [&_form_button]:focus-visible:outline-offset-2 [&_form_button]:focus-visible:outline-accent'

export function AppHeader({
  onOpenMobileMenu,
  userDisplayName,
  onOpenCapture,
  captureTriggerRef,
}: AppHeaderProps) {
  const pathname = usePathname()
  const currentNav = getNavItemByPathname(pathname)

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <div className="flex h-14 items-center gap-3 px-4 lg:gap-4 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Menü öffnen"
          className={`${iconButtonStyles} border border-zinc-200/80 lg:hidden`}
        >
          <MenuIcon className="h-[1.125rem] w-[1.125rem]" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight text-zinc-900">
            {currentNav?.title ?? 'AgenturOS'}
          </h1>
          {currentNav?.description ? (
            <p className="hidden truncate text-xs text-zinc-500 sm:block">
              {currentNav.description}
            </p>
          ) : null}
        </div>

        <QuickCaptureButton
          variant="inline"
          onClick={onOpenCapture}
          buttonRef={captureTriggerRef}
        />

        <div className="hidden items-center gap-2 md:flex">
          <div
            aria-hidden="true"
            title="Globale Suche folgt in einem späteren Schritt"
            className="inline-flex h-9 min-w-[14rem] items-center gap-2.5 rounded-xl bg-zinc-100/90 px-3.5 text-sm text-zinc-400 ring-1 ring-zinc-200/60"
          >
            <SearchIcon className="h-4 w-4 shrink-0" />
            <span>Suchen …</span>
          </div>
          <div
            aria-hidden="true"
            title="Benachrichtigungen folgen in einem späteren Schritt"
            className={iconButtonStyles}
          >
            <BellIcon className="h-4 w-4" />
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="text-right">
            <p className="max-w-[12rem] truncate text-sm font-medium text-zinc-900">
              {userDisplayName}
            </p>
          </div>
          <div className={logoutButtonStyles}>
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  )
}
