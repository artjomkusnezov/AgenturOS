'use client'

import Link from 'next/link'

import { AppNavigation } from '@/components/app/app-navigation'
import { QuickCaptureButton } from '@/components/app/quick-capture-button'
import { LogoutButton } from '@/features/auth/components/logout-button'
import type { AppCaseViewNavItem } from '@/config/app-navigation'
import {
  aosAppSidebarClassName,
  aosSidebarUserClassName,
  aosTextMetaClassName,
  aosTextSmallClassName,
} from '@/lib/design-system'

type AppSidebarProps = {
  userDisplayName: string
  className?: string
  onOpenCapture: (trigger: HTMLButtonElement) => void
  caseViews?: AppCaseViewNavItem[]
}

export function AppSidebar({
  userDisplayName,
  className = '',
  onOpenCapture,
  caseViews = [],
}: AppSidebarProps) {
  return (
    <aside className={`${aosAppSidebarClassName} ${className}`}>
      <div className="flex h-12 shrink-0 items-center border-b border-zinc-200/70 px-5">
        <Link
          href="/app"
          className="text-base font-semibold tracking-tight text-zinc-900 transition-colors duration-150 hover:text-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          AgenturOS
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
        <QuickCaptureButton variant="sidebar" onClick={onOpenCapture} />
        <AppNavigation caseViews={caseViews} />
      </div>

      <div className={aosSidebarUserClassName}>
        <p className={`truncate ${aosTextSmallClassName} font-medium text-zinc-900`}>
          {userDisplayName}
        </p>
        <p className={`mt-0.5 truncate ${aosTextMetaClassName}`}>Angemeldet</p>
        <div className="mt-3 [&_form_button]:w-full [&_form_button]:justify-center">
          <LogoutButton />
        </div>
      </div>
    </aside>
  )
}
