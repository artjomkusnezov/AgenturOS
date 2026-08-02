import { redirect } from 'next/navigation'

import { AppShellWithNavSuspense } from '@/components/app/app-shell'
import type { AppCaseViewNavItem } from '@/config/app-navigation'
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
  const navViewsResult = await listNavigationWorkspaceViews()
  const caseViews: AppCaseViewNavItem[] = navViewsResult.success
    ? navViewsResult.views.map((view) => ({
        key: view.key,
        name: view.name,
        icon: view.icon,
        href: `/app/cases?view=${encodeURIComponent(view.key)}`,
      }))
    : []

  return (
    <AppShellWithNavSuspense userDisplayName={displayName} caseViews={caseViews}>
      {children}
    </AppShellWithNavSuspense>
  )
}
