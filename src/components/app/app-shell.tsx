'use client'

import { useRef, useState } from 'react'

import { AppHeader } from '@/components/app/app-header'
import { AppSidebar } from '@/components/app/app-sidebar'
import { MobileNavigation } from '@/components/app/mobile-navigation'
import {
  UniversalCaptureRoot,
  type OpenCaptureMenu,
} from '@/features/capture/components/universal-capture-root'

type AppShellProps = {
  children: React.ReactNode
  userDisplayName: string
}

export function AppShell({ children, userDisplayName }: AppShellProps) {
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
      />

      <MobileNavigation
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        userDisplayName={userDisplayName}
        onOpenCapture={openCapture}
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
