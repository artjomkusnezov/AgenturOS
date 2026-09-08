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
 * Öffentliche Kfz-Landingpage für Allianz Kusnezov / Lengerich.
 * Persönliche lokale Prüfung — ohne Preis- oder Tarifversprechen.
 */
export function KfzLandingShell({ children }: KfzLandingShellProps) {
  return (
    <div
      lang="de"
      className="min-h-full flex-1 overflow-x-hidden bg-[#eef2f8] text-zinc-900"
    >
      <div className="mx-auto w-full max-w-lg px-4 pb-10 pt-5 sm:max-w-xl sm:px-6 sm:pb-14 sm:pt-8">
        <header className="rounded-3xl bg-[#0b3d91] px-5 py-6 text-white shadow-sm sm:px-7 sm:py-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
            {KFZ_LANDING_AGENCY_NAME}
          </p>
          <h1 className="mt-2 text-[1.7rem] font-semibold leading-tight tracking-tight sm:text-4xl">
            Kfz-Versicherung in {KFZ_LANDING_REGION_LABEL}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-blue-50 sm:text-base">
            Persönliche Prüfung vor Ort. Unverbindliche Anfrage — keine Online-Preisgarantie,
            kein automatisches Tarifversprechen.
          </p>
          <a
            href="#kfz-anfrage"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-white px-4 text-base font-semibold text-[#0b3d91] shadow-sm sm:w-auto sm:min-w-[14rem]"
          >
            Unverbindlich anfragen
          </a>
        </header>

        <section
          className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3"
          aria-label="Was Sie erwarten können"
        >
          <TrustChip title="Lokal" text="Lengerich und Umgebung — persönlich geprüft." />
          <TrustChip title="Unverbindlich" text="Keine Online-Preisgarantie, kein Tarifversprechen." />
          <TrustChip title="Ihr Weg" text="Rückmeldung per WhatsApp, Telefon oder E-Mail." />
        </section>

        <section
          id="kfz-anfrage"
          className="mt-5 scroll-mt-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
          aria-labelledby="kfz-form-heading"
        >
          <h2
            id="kfz-form-heading"
            className="text-lg font-semibold tracking-tight text-zinc-900"
          >
            In drei kurzen Schritten
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
            Die Anfrage kommt in unsere Inbox. Ein Mensch prüft sie — es gibt keine
            automatische Antwort und keine KI-Tarifausgabe auf dieser Seite.
          </p>
          <div className="mt-5">{children}</div>
        </section>

        <footer className="mt-8 space-y-2 border-t border-zinc-200 pt-5 text-sm text-zinc-600">
          <p>
            <span className="font-medium text-zinc-800">{KFZ_LANDING_AGENCY_NAME}</span>
            {' · '}
            {KFZ_LANDING_REGION_LABEL}
          </p>
          <p>
            Kontakt ohne Formular:{' '}
            <a
              className="font-medium text-blue-800 underline-offset-2 hover:underline"
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

function TrustChip({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3.5 py-3">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 sm:text-sm">{text}</p>
    </div>
  )
}
