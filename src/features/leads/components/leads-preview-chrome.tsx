'use client'

import { useState } from 'react'
import Link from 'next/link'

import { AppNavigation } from '@/components/app/app-navigation'
import { CloseIcon, MenuIcon } from '@/components/app/app-icons'
import {
  KFZ_LEADS_DASHBOARD_PREVIEW_PATH,
  KFZ_LEADS_PREVIEW_CASE_VIEWS,
  resolveLeadsPreviewHref,
} from '@/features/leads/lib/kfz-leads-preview'
import {
  aosAppSidebarClassName,
  aosDialogOverlayClassName,
  aosIconButtonClassName,
} from '@/lib/design-system'

type LeadsPreviewChromeProps = {
  children: React.ReactNode
}

const previewCaseViews = KFZ_LEADS_PREVIEW_CASE_VIEWS.map((view) => ({ ...view }))

export function LeadsPreviewChrome({ children }: LeadsPreviewChromeProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="aos-cockpit-shell flex min-h-screen">
      <aside className={`${aosAppSidebarClassName} hidden lg:flex`}>
        <div className="aos-sidebar-brand">
          <Link href={KFZ_LEADS_DASHBOARD_PREVIEW_PATH} className="aos-sidebar-brand-link">
            <span className="aos-sidebar-brand-allianz">Allianz</span>
            <span className="aos-sidebar-brand-kusnezov">KUSNEZOV</span>
          </Link>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
          <AppNavigation caseViews={previewCaseViews} resolveHref={resolveLeadsPreviewHref} />
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Menü schließen"
            className={aosDialogOverlayClassName}
            onClick={() => setMobileOpen(false)}
          />
          <div className={`${aosAppSidebarClassName} absolute inset-y-0 left-0 w-[min(100%,16rem)]`}>
            <div className="flex h-12 items-center justify-between border-b border-zinc-200/70 px-4">
              <p className="text-sm font-semibold">Navigation</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className={aosIconButtonClassName}
                aria-label="Navigation schließen"
              >
                <CloseIcon className="h-[1.125rem] w-[1.125rem]" />
              </button>
            </div>
            <div className="overflow-y-auto px-3 py-3">
              <AppNavigation
                caseViews={previewCaseViews}
                resolveHref={resolveLeadsPreviewHref}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 px-3 py-2 lg:hidden">
          <button
            type="button"
            className={aosIconButtonClassName}
            aria-label="Navigation öffnen"
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <p className="text-xs font-medium tracking-wide text-zinc-400">
            Lokale Vorschau · Leads · kein Versand
          </p>
        </header>
        <p className="hidden px-6 pt-3 text-xs font-medium tracking-wide text-zinc-400 lg:block">
          Lokale Vorschau · synthetischer Kfz-Lead · kein Versand · keine Kundennachricht
        </p>
        <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
