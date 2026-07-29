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
        className="absolute inset-0 bg-zinc-900/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-nav-title"
        className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-white shadow-xl"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-4">
          <p id="mobile-nav-title" className="text-base font-semibold text-zinc-900">
            AgenturOS
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Navigation schließen"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <AppNavigation onNavigate={onClose} />
        </div>

        <div className="shrink-0 border-t border-zinc-200 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="truncate text-sm font-medium text-zinc-900">{userDisplayName}</p>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  )
}
