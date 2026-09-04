import Link from 'next/link'
import type { ReactNode } from 'react'

type LegalPageShellProps = {
  title: string
  description: string
  children: ReactNode
}

/**
 * Öffentliche Legal-Seiten (ohne App-Shell / ohne Login).
 * Visuell an die dunkle AgenturOS-Oberfläche angelehnt.
 */
export function LegalPageShell({ title, description, children }: LegalPageShellProps) {
  return (
    <div className="aos-cockpit-shell min-h-full flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 border-b border-white/10 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300/90">
            AgenturOS
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-[0.95rem]">
            {description}
          </p>
          <nav
            aria-label="Rechtliche Seiten"
            className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm"
          >
            <Link
              href="/datenschutz"
              className="text-sky-300 underline-offset-4 hover:text-sky-200 hover:underline"
            >
              Datenschutz
            </Link>
            <Link
              href="/datenloeschung"
              className="text-sky-300 underline-offset-4 hover:text-sky-200 hover:underline"
            >
              Datenlöschung
            </Link>
            <Link
              href="/login"
              className="text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
            >
              Anmelden
            </Link>
          </nav>
        </header>

        <main className="space-y-8 text-[0.95rem] leading-relaxed text-slate-200">
          {children}
        </main>

        <footer className="mt-12 border-t border-white/10 pt-5 text-xs text-slate-500">
          <p>
            Stand dieser Seite: {new Date().toLocaleDateString('de-DE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <p className="mt-1">
            Kontakt für Datenschutzanfragen:{' '}
            <a
              href="mailto:info@artkus.de"
              className="text-sky-300/90 underline-offset-2 hover:underline"
            >
              info@artkus.de
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-slate-50">{title}</h2>
      <div className="space-y-3 text-slate-300">{children}</div>
    </section>
  )
}

/** Kennzeichnung fehlender, vom Owner zu ergänzender Rechts-/Unternehmensangaben. */
export function OwnerInputNote({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3.5 py-3 text-sm text-amber-100">
      <p className="font-semibold text-amber-50">OWNER INPUT</p>
      <div className="mt-1.5 space-y-2 text-amber-100/95">{children}</div>
    </aside>
  )
}
