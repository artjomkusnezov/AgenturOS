'use client'

import { useState } from 'react'

import { AppHeader } from '@/components/app/app-header'
import { AppSidebar } from '@/components/app/app-sidebar'
import { MobileNavigation } from '@/components/app/mobile-navigation'
import { QuickCaptureButton } from '@/components/app/quick-capture-button'

type AppShellProps = {
  children: React.ReactNode
  userDisplayName: string
}

export function AppShell({ children, userDisplayName }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <AppSidebar userDisplayName={userDisplayName} className="hidden lg:flex" />

      <MobileNavigation
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        userDisplayName={userDisplayName}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          userDisplayName={userDisplayName}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-x-hidden overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      <QuickCaptureButton variant="floating" />
    </div>
  )
}
