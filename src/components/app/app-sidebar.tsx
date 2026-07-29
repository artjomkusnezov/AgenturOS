import Link from 'next/link'

import { AppNavigation } from '@/components/app/app-navigation'
import { LogoutButton } from '@/features/auth/components/logout-button'

type AppSidebarProps = {
  userDisplayName: string
  className?: string
}

const logoutButtonStyles =
  '[&_form_button]:w-full [&_form_button]:rounded-xl [&_form_button]:border [&_form_button]:border-zinc-200/80 [&_form_button]:bg-white/80 [&_form_button]:px-3 [&_form_button]:py-2 [&_form_button]:text-sm [&_form_button]:font-medium [&_form_button]:text-zinc-600 [&_form_button]:transition-colors [&_form_button]:duration-150 [&_form_button]:hover:border-zinc-300 [&_form_button]:hover:bg-white [&_form_button]:hover:text-zinc-900 [&_form_button]:focus-visible:outline [&_form_button]:focus-visible:outline-2 [&_form_button]:focus-visible:outline-offset-2 [&_form_button]:focus-visible:outline-accent'

export function AppSidebar({ userDisplayName, className = '' }: AppSidebarProps) {
  return (
    <aside
      className={`flex w-[17rem] shrink-0 flex-col border-r border-zinc-200/80 bg-zinc-100/70 ${className}`}
    >
      <div className="flex h-14 items-center px-5">
        <Link
          href="/app"
          className="text-lg font-semibold tracking-tight text-zinc-900 transition-opacity duration-150 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          AgenturOS
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <AppNavigation />
      </div>

      <div className="p-3">
        <div className="rounded-xl bg-zinc-200/40 p-3">
          <p className="truncate text-sm font-medium text-zinc-900">{userDisplayName}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">Angemeldet</p>
          <div className={`mt-3 ${logoutButtonStyles}`}>
            <LogoutButton />
          </div>
        </div>
      </div>
    </aside>
  )
}
