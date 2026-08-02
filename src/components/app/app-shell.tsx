'use client'

import { Suspense, useRef, useState } from 'react'

import { AppHeader } from '@/components/app/app-header'
import { AppSidebar } from '@/components/app/app-sidebar'
import { MobileNavigation } from '@/components/app/mobile-navigation'
import type { AppCaseViewNavItem } from '@/config/app-navigation'
import {
  UniversalCaptureRoot,
  type OpenCaptureMenu,
} from '@/features/capture/components/universal-capture-root'

type AppShellProps = {
  children: React.ReactNode
  userDisplayName: string
  caseViews?: AppCaseViewNavItem[]
}

export function AppShell({
  children,
  userDisplayName,
  caseViews = [],
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const openCaptureRef = useRef<OpenCaptureMenu>(() => undefined)

  const openCapture = (trigger: HTMLButtonElement) => {
    setMobileMenuOpen(false)
    openCaptureRef.current(trigger)
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <AppSidebar
        userDisplayName={userDisplayName}
        className="hidden lg:flex"
        onOpenCapture={openCapture}
        caseViews={caseViews}
      />

      <MobileNavigation
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        userDisplayName={userDisplayName}
        onOpenCapture={openCapture}
        caseViews={caseViews}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-16">
          {children}
        </main>
      </div>

      <UniversalCaptureRoot
        registerOpener={(openMenu) => {
          openCaptureRef.current = openMenu
        }}
      />
    </div>
  )
}

/** useSearchParams in navigation requires a Suspense boundary in the tree. */
export function AppShellWithNavSuspense(props: AppShellProps) {
  return (
    <Suspense fallback={<AppShell {...props} caseViews={props.caseViews} />}>
      <AppShell {...props} />
    </Suspense>
  )
}
