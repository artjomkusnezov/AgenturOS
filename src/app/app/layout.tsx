import { redirect } from 'next/navigation'

import { AppShellWithNavSuspense } from '@/components/app/app-shell'
import type { AppCaseViewNavItem } from '@/config/app-navigation'
import { listCurrentAgencyMembers } from '@/features/agency/repositories/agency-repository'
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
  const [navViewsResult, membersResult] = await Promise.all([
    listNavigationWorkspaceViews(),
    listCurrentAgencyMembers(),
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

  return (
    <AppShellWithNavSuspense
      userDisplayName={displayName}
      caseViews={caseViews}
      agencyMembers={agencyMembers}
      currentUserId={user.id}
    >
      {children}
    </AppShellWithNavSuspense>
  )
}
