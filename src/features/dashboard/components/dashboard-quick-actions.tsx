import Link from 'next/link'

import { AppNavIconGlyph } from '@/components/app/app-icons'
import type { AppNavIcon } from '@/config/app-navigation'

const actionClassName =
  'inline-flex min-h-11 min-w-[9rem] flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200/50 transition-all duration-150 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.99] sm:flex-none'

type QuickActionProps = {
  href: string
  label: string
  icon: AppNavIcon
}

function QuickActionLink({ href, label, icon }: QuickActionProps) {
  return (
    <Link href={href} className={actionClassName}>
      <AppNavIconGlyph icon={icon} className="h-4 w-4 shrink-0 text-zinc-500" />
      <span>{label}</span>
    </Link>
  )
}

export function DashboardQuickActions() {
  return (
    <section
      aria-labelledby="dashboard-quick-actions-heading"
      className="rounded-xl border border-zinc-200/60 bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200/30 sm:p-5"
    >
      <h2
        id="dashboard-quick-actions-heading"
        className="text-sm font-semibold tracking-tight text-zinc-900"
      >
        Schnellerfassung
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Direkt zu den Modulen wechseln und neue Inhalte erfassen.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <QuickActionLink href="/app/inbox" label="Neuer Eingang" icon="inbox" />
        <QuickActionLink href="/app/tasks" label="Neue Aufgabe" icon="tasks" />
        <QuickActionLink href="/app/information" label="Neue Information" icon="information" />
      </div>
    </section>
  )
}
