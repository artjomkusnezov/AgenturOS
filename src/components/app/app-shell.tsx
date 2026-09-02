'use client'

import { Suspense, useCallback, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

import { AppHeader } from '@/components/app/app-header'
import { AppSidebar } from '@/components/app/app-sidebar'
import { MobileNavigation } from '@/components/app/mobile-navigation'
import { QuickCaptureButton } from '@/components/app/quick-capture-button'
import type { AppCaseViewNavItem } from '@/config/app-navigation'
import type { AgencyMember } from '@/features/agency/types/agency-member'
import type { NavigationBadgeCounts } from '@/features/navigation/types/navigation-badges'
import {
  UniversalCaptureRoot,
  type OpenCaptureMenu,
} from '@/features/capture/components/universal-capture-root'

type AppShellProps = {
  children: React.ReactNode
  userDisplayName: string
  caseViews?: AppCaseViewNavItem[]
  agencyMembers?: AgencyMember[]
  currentUserId?: string
  badgeCounts?: NavigationBadgeCounts
}

export function AppShell({
  children,
  userDisplayName,
  caseViews = [],
  agencyMembers = [],
  currentUserId = '',
  badgeCounts,
}: AppShellProps) {
  const pathname = usePathname()
  const isAgenturzentrale = pathname === '/app'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false)
  const openCaptureRef = useRef<OpenCaptureMenu>(() => undefined)

  const registerOpener = useCallback((openMenu: OpenCaptureMenu) => {
    openCaptureRef.current = openMenu
  }, [])

  const openCapture = (trigger: HTMLButtonElement) => {
    setMobileMenuOpen(false)
    openCaptureRef.current(trigger)
  }

  return (
    <div
      className={`flex min-h-screen ${isAgenturzentrale ? 'agenturzentrale-shell bg-[var(--az-bg-deep)]' : 'bg-zinc-50'}`}
    >
      <AppSidebar
        userDisplayName={userDisplayName}
        className="hidden lg:flex"
        caseViews={caseViews}
        badgeCounts={badgeCounts}
        variant={isAgenturzentrale ? 'agenturzentrale' : 'default'}
      />

      <MobileNavigation
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        userDisplayName={userDisplayName}
        onOpenCapture={openCapture}
        caseViews={caseViews}
        badgeCounts={badgeCounts}
        variant={isAgenturzentrale ? 'agenturzentrale' : 'default'}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <div
          className={`sticky top-0 z-20 hidden shrink-0 items-center justify-end px-6 pb-2 pt-4 backdrop-blur-sm lg:flex ${
            isAgenturzentrale ? 'az-main-toolbar' : 'bg-zinc-50/90'
          }`}
        >
          <QuickCaptureButton
            variant="toolbar"
            onClick={openCapture}
            isExpanded={captureMenuOpen}
            data-capture-placement="toolbar"
          />
        </div>

        <main
          className={`flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0 ${
            isAgenturzentrale ? 'az-main-content' : ''
          }`}
        >
          {children}
        </main>
      </div>

      <UniversalCaptureRoot
        registerOpener={registerOpener}
        onMenuOpenChange={setCaptureMenuOpen}
        members={agencyMembers}
        currentUserId={currentUserId}
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
