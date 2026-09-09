import type { Metadata } from 'next'

import { KfzLandingWithAnalytics } from '@/features/inbound/kfz/components/kfz-landing-with-analytics'
import { KfzLandingShell } from '@/features/inbound/kfz/components/kfz-landing-shell'
import { readKfzLandingAttributionFromSearchParams } from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import {
  KFZ_LANDING_AGENCY_NAME,
  KFZ_LANDING_REGION_LABEL,
} from '@/features/inbound/kfz/lib/kfz-landing-constants'

export const metadata: Metadata = {
  title: `Kfz-Versicherung ${KFZ_LANDING_REGION_LABEL} | ${KFZ_LANDING_AGENCY_NAME}`,
  description: `Kostenloser und unverbindlicher Kfz-Check bei ${KFZ_LANDING_AGENCY_NAME} in ${KFZ_LANDING_REGION_LABEL}. Persönlich geprüft von Artjom und Vera Kusnezov.`,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: `Kfz-Versicherung · ${KFZ_LANDING_AGENCY_NAME}`,
    description: `Anfrage für Kfz-Versicherung in ${KFZ_LANDING_REGION_LABEL}.`,
    locale: 'de_DE',
    type: 'website',
  },
}

type KfzPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Öffentlicher Kfz-Funnel unter /kfz (später routingfähig für kfz.artkus.de).
 * Sendet über Server Action in denselben Handler wie POST /api/inbound/kfz.
 */
export default async function KfzLandingPage({ searchParams }: KfzPageProps) {
  const params = await searchParams
  const attribution = readKfzLandingAttributionFromSearchParams(params)

  return (
    <KfzLandingShell>
      <KfzLandingWithAnalytics attribution={attribution} />
    </KfzLandingShell>
  )
}
