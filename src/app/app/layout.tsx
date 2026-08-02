import { redirect } from 'next/navigation'

import { AppShellWithNavSuspense } from '@/components/app/app-shell'
import type { AppCaseViewNavItem } from '@/config/app-navigation'
import { listCurrentAgencyMembers } from '@/features/agency/repositories/agency-repository'
import { getCachedNavigationBadgeCounts } from '@/features/navigation/lib/get-cached-navigation-badge-counts'
import { EMPTY_NAVIGATION_BADGE_COUNTS } from '@/features/navigation/types/navigation-badges'
import { listNavigationWorkspaceViews } from '@/features/workspace-views/repositories/workspace-views-repository'
import { createClient } from '@/lib/supabase/server'
import { getDisplayName } from '@/lib/user/get-display-name'

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const displayName = getDisplayName(user) ?? 'Benutzer'
  const [navViewsResult, membersResult, badgeCountsResult] = await Promise.all([
    listNavigationWorkspaceViews(),
    listCurrentAgencyMembers(),
    getCachedNavigationBadgeCounts(),
  ])

  const caseViews: AppCaseViewNavItem[] = navViewsResult.success
    ? navViewsResult.views.map((view) => ({
        key: view.key,
        name: view.name,
        icon: view.icon,
        href: `/app/cases?view=${encodeURIComponent(view.key)}`,
      }))
    : []

  const agencyMembers = membersResult.success ? membersResult.members : []
  const badgeCounts = badgeCountsResult.counts ?? EMPTY_NAVIGATION_BADGE_COUNTS

  return (
    <AppShellWithNavSuspense
      userDisplayName={displayName}
      caseViews={caseViews}
      agencyMembers={agencyMembers}
      currentUserId={user.id}
      badgeCounts={badgeCounts}
    >
      {children}
    </AppShellWithNavSuspense>
  )
}
