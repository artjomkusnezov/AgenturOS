'use client'

import { Button } from '@/components/ui/button'
import { KFZ_ANALYTICS_CONSENT_VERSION } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
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
      <p
        className="text-xs leading-relaxed text-zinc-500"
        data-kfz-analytics-consent={consent}
      >
        {consent === 'granted'
          ? 'Nutzungsmessung aktiv (anonym, ohne Formularantworten).'
          : 'Nutzungsmessung aus. Es werden keine Messereignisse gespeichert.'}{' '}
        Stand: {KFZ_ANALYTICS_CONSENT_VERSION}.
      </p>
    )
  }

  return (
    <div
      className="rounded-2xl border border-[#d7e0ea] bg-[#f7fafc] px-4 py-3"
      data-kfz-analytics-consent="unknown"
      role="region"
      aria-label="Nutzungsmessung"
    >
      <p className="text-sm font-semibold text-zinc-900">Nutzung dieser Seite messen?</p>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
        Optional und nur nach Ihrer Wahl. Gemessen werden Besuche, grobe Herkunft,
        gewählter Weg, Schritte, Abbrüche und aktive Zeit. Nicht gespeichert werden
        Formularantworten, Name, Telefon, E-Mail, Kennzeichen, Fahrzeugdaten, Dateien,
        IP-Adresse oder die volle Adresszeile.
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
        Technische Grenze für spätere rechtliche Prüfung — keine Rechtsaussage.
        Ohne Zustimmung wird nichts gemessen.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          data-kfz-analytics-consent-grant="true"
          onClick={onGrant}
        >
          Messung erlauben
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          data-kfz-analytics-consent-decline="true"
          onClick={onDecline}
        >
          Ablehnen
        </Button>
      </div>
    </div>
  )
}
