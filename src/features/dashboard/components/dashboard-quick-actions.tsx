import Link from 'next/link'

const actionClassName =
  'inline-flex items-center justify-center rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200/50 transition-colors duration-150 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export function DashboardQuickActions() {
  return (
    <section aria-labelledby="dashboard-quick-actions-heading">
      <h2
        id="dashboard-quick-actions-heading"
        className="text-sm font-semibold tracking-tight text-zinc-900"
      >
        Schnellerfassung
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/app/inbox" className={actionClassName}>
          Neuer Eingang
        </Link>
        <Link href="/app/tasks" className={actionClassName}>
          Neue Aufgabe
        </Link>
        <Link href="/app/information" className={actionClassName}>
          Neue Information
        </Link>
      </div>
    </section>
  )
}
