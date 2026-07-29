import Link from 'next/link'

import { AppNavigation } from '@/components/app/app-navigation'
import { LogoutButton } from '@/features/auth/components/logout-button'

type AppSidebarProps = {
  userDisplayName: string
  className?: string
}

export function AppSidebar({ userDisplayName, className = '' }: AppSidebarProps) {
  return (
    <aside
      className={`flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white ${className}`}
    >
      <div className="flex h-16 items-center border-b border-zinc-200 px-5">
        <Link
          href="/app"
          className="text-base font-semibold tracking-tight text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          AgenturOS
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <AppNavigation />
      </div>

      <div className="border-t border-zinc-200 px-4 py-4">
        <p className="truncate text-sm font-medium text-zinc-900">{userDisplayName}</p>
        <div className="mt-3">
          <LogoutButton />
        </div>
      </div>
    </aside>
  )
}
