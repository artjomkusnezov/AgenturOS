'use client'

import Link from 'next/link'

import { AppNavigation } from '@/components/app/app-navigation'
import { LogoutButton } from '@/features/auth/components/logout-button'
import type { AppCaseViewNavItem } from '@/config/app-navigation'
import type { NavigationBadgeCounts } from '@/features/navigation/types/navigation-badges'
import {
  aosAppSidebarClassName,
  aosSidebarUserClassName,
  aosTextMetaClassName,
  aosTextSmallClassName,
} from '@/lib/design-system'

type AppSidebarProps = {
  userDisplayName: string
  className?: string
  caseViews?: AppCaseViewNavItem[]
  badgeCounts?: NavigationBadgeCounts
  variant?: 'default' | 'agenturzentrale'
}

export function AppSidebar({
  userDisplayName,
  className = '',
  caseViews = [],
  badgeCounts,
  variant = 'default',
}: AppSidebarProps) {
  const isDark = variant === 'agenturzentrale'

  return (
    <aside
      className={`${aosAppSidebarClassName} ${isDark ? 'az-sidebar border-r border-[var(--az-border-subtle)] bg-[var(--az-bg-shell)]' : ''} ${className}`}
    >
      <div
        className={`flex h-12 shrink-0 items-center border-b px-5 ${
          isDark ? 'az-sidebar-brand border-[var(--az-border-subtle)]' : 'border-zinc-200/70'
        }`}
      >
        <Link
          href="/app"
          className={`text-base font-semibold tracking-tight transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            isDark
              ? 'text-[var(--az-text-primary)] hover:text-[var(--az-accent-blue)]'
              : 'text-zinc-900 hover:text-zinc-700'
          }`}
        >
          AgenturOS
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
        <AppNavigation
          caseViews={caseViews}
          badgeCounts={badgeCounts}
          variant={variant}
        />
      </div>

      <div
        className={`${aosSidebarUserClassName} ${isDark ? 'az-sidebar-user border-[var(--az-border-subtle)]' : ''}`}
      >
        <p
          className={`truncate ${aosTextSmallClassName} font-medium ${
            isDark ? 'az-sidebar-user-name text-[var(--az-text-primary)]' : 'text-zinc-900'
          }`}
        >
          {userDisplayName}
        </p>
        <p
          className={`mt-0.5 truncate ${aosTextMetaClassName} ${
            isDark ? 'az-sidebar-user-meta text-[var(--az-text-muted)]' : ''
          }`}
        >
          Angemeldet
        </p>
        <div className="mt-3 [&_form_button]:w-full [&_form_button]:justify-center">
          <LogoutButton />
        </div>
      </div>
    </aside>
  )
}
