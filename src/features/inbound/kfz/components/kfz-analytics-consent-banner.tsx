'use client'

import { Button } from '@/components/ui/button'
import type { KfzAnalyticsConsentState } from '@/features/inbound/kfz/types/kfz-analytics'

type KfzAnalyticsConsentBannerProps = {
  consent: KfzAnalyticsConsentState
  onGrant: () => void
  onDecline: () => void
}

export function KfzAnalyticsConsentBanner({
  consent,
  onGrant,
  onDecline,
}: KfzAnalyticsConsentBannerProps) {
  if (consent !== 'unknown') {
    return (
      <div
        className="flex items-center justify-between gap-3"
        data-kfz-analytics-consent={consent}
      >
        <p className="text-xs leading-relaxed text-zinc-500">
          {consent === 'granted'
            ? 'Nutzungsmessung aktiv (anonym, ohne Formularantworten).'
            : 'Nutzungsmessung aus. Es werden keine Messereignisse gespeichert.'}
        </p>
        {consent === 'granted' ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 shrink-0 self-start px-3"
            data-kfz-analytics-consent-withdraw="true"
            onClick={onDecline}
          >
            Messung beenden
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border border-[#d7e0ea] bg-[#f7fafc] px-3 py-2.5"
      data-kfz-analytics-consent="unknown"
      role="region"
      aria-label="Nutzungsmessung"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">Nutzung dieser Seite messen?</p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
            Optional. Ohne Zustimmung wird nichts gemessen.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 flex-1 px-3 sm:flex-none"
            data-kfz-analytics-consent-grant="true"
            onClick={onGrant}
          >
            Messung erlauben
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 flex-1 px-3 sm:flex-none"
            data-kfz-analytics-consent-decline="true"
            onClick={onDecline}
          >
            Ablehnen
          </Button>
        </div>
      </div>
      <details className="mt-1.5">
        <summary className="cursor-pointer text-xs font-medium text-[#0050aa]">
          Was wird gemessen?
        </summary>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">
          Optional und nur nach Ihrer Wahl. Gemessen werden Besuche, grobe Herkunft
          und Referrer-Kategorie, gewählter Weg, Schritte, Übergänge, Abbrüche und
          aktive Zeit. Nicht gespeichert werden Formularantworten, Name, Telefon,
          E-Mail, Kennzeichen, Fahrzeugdaten, Dateien, freie Texte oder
          Internetadressen.
        </p>
      </details>
    </div>
  )
}
