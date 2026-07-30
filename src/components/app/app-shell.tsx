'use client'

import { useRef, useState } from 'react'

import { AppHeader } from '@/components/app/app-header'
import { AppSidebar } from '@/components/app/app-sidebar'
import { MobileNavigation } from '@/components/app/mobile-navigation'
import { QuickCaptureButton } from '@/components/app/quick-capture-button'
import { UniversalCaptureDialog } from '@/features/capture/components/universal-capture-dialog'

type AppShellProps = {
  children: React.ReactNode
  userDisplayName: string
}

export function AppShell({ children, userDisplayName }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)
  const captureTriggerRef = useRef<HTMLButtonElement>(null)

  const openCapture = () => {
    setMobileMenuOpen(false)
    setCaptureOpen(true)
  }

  return (
    <div className="flex min-h-screen bg-zinc-50/80">
      <AppSidebar
        userDisplayName={userDisplayName}
        className="hidden lg:flex"
        onOpenCapture={openCapture}
        captureTriggerRef={captureTriggerRef}
      />

      <MobileNavigation
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        userDisplayName={userDisplayName}
        onOpenCapture={openCapture}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          userDisplayName={userDisplayName}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenCapture={openCapture}
          captureTriggerRef={captureTriggerRef}
        />

        <main className="flex-1 overflow-x-hidden overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-10">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10">
            {children}
          </div>
        </main>
      </div>

      <QuickCaptureButton
        variant="floating"
        onClick={openCapture}
        buttonRef={captureTriggerRef}
      />

      <UniversalCaptureDialog
        isOpen={captureOpen}
        onClose={() => setCaptureOpen(false)}
        triggerRef={captureTriggerRef}
      />
    </div>
  )
}
