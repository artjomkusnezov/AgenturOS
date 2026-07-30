import type { ReactNode } from 'react'

import Link from 'next/link'

type DashboardPanelProps = {
  title: string
  headingId: string
  href?: string
  hrefLabel?: string
  children: ReactNode
}

export function DashboardPanel({
  title,
  headingId,
  href,
  hrefLabel = 'Alle anzeigen',
  children,
}: DashboardPanelProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="flex min-h-[16rem] flex-col rounded-xl border border-zinc-200/60 bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200/30 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-sm font-semibold tracking-tight text-zinc-900">
          {title}
        </h2>
        {href ? (
          <Link
            href={href}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {hrefLabel}
          </Link>
        ) : null}
      </div>

      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

type DashboardPanelEmptyProps = {
  title: string
  description: string
}

export function DashboardPanelEmpty({ title, description }: DashboardPanelEmptyProps) {
  return (
    <div className="flex h-full min-h-[10rem] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200/80 bg-zinc-50/50 px-4 py-6 text-center">
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-zinc-500">{description}</p>
    </div>
  )
}
