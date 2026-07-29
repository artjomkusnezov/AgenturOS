'use client'

import { useEffect, useRef } from 'react'

import { AppNavigation } from '@/components/app/app-navigation'
import { CloseIcon } from '@/components/app/app-icons'
import { LogoutButton } from '@/features/auth/components/logout-button'

type MobileNavigationProps = {
  isOpen: boolean
  onClose: () => void
  userDisplayName: string
}

const logoutButtonStyles =
  '[&_form_button]:w-full [&_form_button]:rounded-xl [&_form_button]:border [&_form_button]:border-zinc-200/80 [&_form_button]:bg-white/80 [&_form_button]:px-3 [&_form_button]:py-2 [&_form_button]:text-sm [&_form_button]:font-medium [&_form_button]:text-zinc-600 [&_form_button]:transition-colors [&_form_button]:duration-150 [&_form_button]:hover:border-zinc-300 [&_form_button]:hover:bg-white [&_form_button]:hover:text-zinc-900 [&_form_button]:focus-visible:outline [&_form_button]:focus-visible:outline-2 [&_form_button]:focus-visible:outline-offset-2 [&_form_button]:focus-visible:outline-accent'

export function MobileNavigation({
  isOpen,
  onClose,
  userDisplayName,
}: MobileNavigationProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousFocus = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousFocus?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        aria-label="Menü schließen"
        className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-nav-title"
        className="absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col bg-zinc-100/95 shadow-2xl ring-1 ring-zinc-200/80"
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <p id="mobile-nav-title" className="text-lg font-semibold tracking-tight text-zinc-900">
            AgenturOS
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Navigation schließen"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors duration-150 hover:bg-zinc-200/60 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <CloseIcon className="h-[1.125rem] w-[1.125rem]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <AppNavigation onNavigate={onClose} />
        </div>

        <div className="shrink-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="rounded-xl bg-zinc-200/40 p-3">
            <p className="truncate text-sm font-medium text-zinc-900">{userDisplayName}</p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">Angemeldet</p>
            <div className={`mt-3 ${logoutButtonStyles}`}>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
