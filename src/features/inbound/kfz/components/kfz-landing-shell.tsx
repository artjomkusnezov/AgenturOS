import type { ReactNode } from 'react'

import {
  KFZ_LANDING_AGENCY_NAME,
  KFZ_LANDING_CONTACT_EMAIL,
  KFZ_LANDING_REGION_LABEL,
} from '@/features/inbound/kfz/lib/kfz-landing-constants'

type KfzLandingShellProps = {
  children: ReactNode
}

/**
 * Öffentliche Kfz-Conversion-Seite (funktional, nicht Kampagnen-Polish).
 * Regional: Allianz Kusnezov / Lengerich — ohne Preisversprechen.
 */
export function KfzLandingShell({ children }: KfzLandingShellProps) {
  return (
    <div
      lang="de"
      className="min-h-full flex-1 bg-gradient-to-b from-slate-100 via-white to-slate-50"
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
        <header className="mb-8 border-b border-zinc-200 pb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-800">
            {KFZ_LANDING_AGENCY_NAME}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Kfz-Versicherung in {KFZ_LANDING_REGION_LABEL}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-600">
            Persönliche Beratung vor Ort — unverbindliche Anfrage, klare Rückmeldung.
            Keine Online-Preisgarantie, keine automatischen Tarifversprechen.
          </p>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-3" aria-label="Vorteile">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Lokal erreichbar</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">
              Ansprechpartner für Lengerich und die Region — nicht nur ein Formular.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Unverbindlich anfragen</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">
              Kurz schildern, was Sie brauchen. Wir melden uns auf dem gewünschten Weg.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Menschliche Prüfung</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">
              Ihre Anfrage geht in die Agentur-Inbox. Einschätzungen erfolgen durch uns —
              nicht durch eine KI-Ausgabe auf dieser Seite.
            </p>
          </div>
        </section>

        <section
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7"
          aria-labelledby="kfz-form-heading"
        >
          <h2
            id="kfz-form-heading"
            className="text-lg font-semibold tracking-tight text-zinc-900"
          >
            Anfrage senden
          </h2>
          <p className="mt-1.5 text-sm text-zinc-600">
            Ein Formular — wir kümmern uns um den Rest.
          </p>
          <div className="mt-5">{children}</div>
        </section>

        <footer className="mt-10 space-y-2 border-t border-zinc-200 pt-5 text-sm text-zinc-600">
          <p>
            <span className="font-medium text-zinc-800">{KFZ_LANDING_AGENCY_NAME}</span>
            {' · '}
            {KFZ_LANDING_REGION_LABEL}
          </p>
          <p>
            Kontakt ohne Formular:{' '}
            <a
              className="font-medium text-blue-700 underline-offset-2 hover:underline"
              href={`mailto:${KFZ_LANDING_CONTACT_EMAIL}`}
            >
              {KFZ_LANDING_CONTACT_EMAIL}
            </a>
          </p>
          <p>
            <a
              href="/datenschutz"
              className="text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline"
            >
              Datenschutz
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}
