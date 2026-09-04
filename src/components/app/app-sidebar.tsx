'use client'

import Link from 'next/link'

import { AppNavigation } from '@/components/app/app-navigation'
import { LogoutButton } from '@/features/auth/components/logout-button'
import { DashboardAvatar } from '@/features/dashboard/components/dashboard-avatar'
import type { AppCaseViewNavItem } from '@/config/app-navigation'
import type { NavigationBadgeCounts } from '@/features/navigation/types/navigation-badges'
import {
  aosAppSidebarClassName,
  aosSidebarUserClassName,
} from '@/lib/design-system'

type AppSidebarProps = {
  userDisplayName: string
  userRoleLabel?: string
  className?: string
  caseViews?: AppCaseViewNavItem[]
  badgeCounts?: NavigationBadgeCounts
}

export function AppSidebar({
  userDisplayName,
  userRoleLabel = 'Angemeldet',
  className = '',
  caseViews = [],
  badgeCounts,
}: AppSidebarProps) {
  return (
    <aside className={`${aosAppSidebarClassName} ${className}`}>
      <div className="aos-sidebar-brand">
        <Link href="/app" className="aos-sidebar-brand-link">
          <span className="aos-sidebar-brand-allianz">Allianz</span>
          <span className="aos-sidebar-brand-kusnezov">KUSNEZOV</span>
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
        <AppNavigation caseViews={caseViews} badgeCounts={badgeCounts} />
      </div>

      <div className={`${aosSidebarUserClassName} aos-sidebar-user-card`}>
        <div className="aos-sidebar-user-meta">
          <DashboardAvatar name={userDisplayName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="aos-sidebar-user-name truncate">{userDisplayName}</p>
            <p className="aos-sidebar-user-role truncate">{userRoleLabel}</p>
          </div>
        </div>
        <div className="mt-2.5 [&_form_button]:w-full [&_form_button]:justify-center">
          <LogoutButton />
        </div>
      </div>
    </aside>
  )
}
