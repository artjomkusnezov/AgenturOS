'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

import { AppNavigation } from '@/components/app/app-navigation'
import { CloseIcon } from '@/components/app/app-icons'
import { QuickCaptureButton } from '@/components/app/quick-capture-button'
import { LogoutButton } from '@/features/auth/components/logout-button'
import type { AppCaseViewNavItem } from '@/config/app-navigation'
import type { NavigationBadgeCounts } from '@/features/navigation/types/navigation-badges'
import {
  aosAppSidebarClassName,
  aosDialogOverlayClassName,
  aosIconButtonClassName,
  aosSidebarUserClassName,
  aosTextMetaClassName,
  aosTextSmallClassName,
} from '@/lib/design-system'

type MobileNavigationProps = {
  isOpen: boolean
  onClose: () => void
  userDisplayName: string
  onOpenCapture: (trigger: HTMLButtonElement) => void
  caseViews?: AppCaseViewNavItem[]
  badgeCounts?: NavigationBadgeCounts
  variant?: 'default' | 'agenturzentrale'
}

export function MobileNavigation({
  isOpen,
  onClose,
  userDisplayName,
  onOpenCapture,
  caseViews = [],
  badgeCounts,
  variant = 'default',
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
        className={aosDialogOverlayClassName}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-nav-title"
        className={`${aosAppSidebarClassName} absolute inset-y-0 left-0 w-[min(100%,16rem)]`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200/70 px-4">
          <Link
            id="mobile-nav-title"
            href="/app"
            onClick={onClose}
            className="text-base font-semibold tracking-tight text-zinc-900"
          >
            AgenturOS
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Navigation schließen"
            className={aosIconButtonClassName}
          >
            <CloseIcon className="h-[1.125rem] w-[1.125rem]" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
          <QuickCaptureButton
            variant="sidebar"
            onClick={(trigger) => {
              onOpenCapture(trigger)
              onClose()
            }}
          />
          <AppNavigation
            onNavigate={onClose}
            caseViews={caseViews}
            badgeCounts={badgeCounts}
            variant={variant}
          />
        </div>

        <div className={`${aosSidebarUserClassName} pb-[max(1rem,env(safe-area-inset-bottom))]`}>
          <p className={`truncate ${aosTextSmallClassName} font-medium text-zinc-900`}>
            {userDisplayName}
          </p>
          <p className={`mt-0.5 truncate ${aosTextMetaClassName}`}>Angemeldet</p>
          <div className="mt-3 [&_form_button]:w-full [&_form_button]:justify-center">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  )
}
