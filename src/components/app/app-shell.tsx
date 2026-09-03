'use client'

import { Suspense, useCallback, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

import { AppHeader } from '@/components/app/app-header'
import { BellIcon, SearchIcon } from '@/components/app/app-icons'
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
  const isCockpit = pathname === '/app'
  const currentMember = agencyMembers.find((member) => member.userId === currentUserId)
  const userRoleLabel =
    currentMember?.role === 'owner'
      ? 'Hauptvertreter'
      : currentMember?.role === 'member'
        ? 'Mitarbeiter'
        : 'Angemeldet'

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
    <div className={`flex min-h-screen ${isCockpit ? 'aos-cockpit-shell' : 'bg-zinc-50'}`}>
      <AppSidebar
        userDisplayName={userDisplayName}
        userRoleLabel={userRoleLabel}
        className="hidden lg:flex"
        caseViews={caseViews}
        badgeCounts={badgeCounts}
      />

      <MobileNavigation
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        userDisplayName={userDisplayName}
        onOpenCapture={openCapture}
        caseViews={caseViews}
        badgeCounts={badgeCounts}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {isCockpit ? (
          <div className="aos-cockpit-topbar">
            <div className="aos-cockpit-search-placeholder" aria-hidden="true">
              <SearchIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">Suche nach Vorgängen, Kunden, Dokumenten…</span>
              <kbd className="aos-cockpit-search-kbd">⌘K</kbd>
            </div>
            <div className="aos-cockpit-topbar-actions">
              <button
                type="button"
                className="aos-cockpit-topbar-icon-btn"
                aria-label="Benachrichtigungen"
              >
                <BellIcon className="h-4 w-4" />
              </button>
              <QuickCaptureButton
                variant="toolbar"
                onClick={openCapture}
                isExpanded={captureMenuOpen}
                data-capture-placement="toolbar"
              />
            </div>
          </div>
        ) : (
          <div className="sticky top-0 z-20 hidden shrink-0 items-center justify-end bg-zinc-50/90 px-6 pb-2 pt-4 backdrop-blur-sm lg:flex">
            <QuickCaptureButton
              variant="toolbar"
              onClick={openCapture}
              isExpanded={captureMenuOpen}
              data-capture-placement="toolbar"
            />
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8">
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
