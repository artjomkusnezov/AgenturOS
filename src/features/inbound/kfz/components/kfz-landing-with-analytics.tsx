'use client'

import {
  KfzLandingAnalyticsRoot,
  type KfzLandingAnalyticsPort,
} from '@/features/inbound/kfz/components/kfz-landing-analytics-root'
import { KfzLandingForm } from '@/features/inbound/kfz/components/kfz-landing-form'
import type { KfzAnalyticsConsentStorage } from '@/features/inbound/kfz/lib/kfz-analytics-consent'
import type { KfzLandingAttribution } from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import type { KfzLandingDraftStorage } from '@/features/inbound/kfz/lib/kfz-landing-draft'
import type { KfzLandingSubmitFn } from '@/features/inbound/kfz/lib/kfz-landing-submit-session'

type KfzLandingWithAnalyticsProps = {
  attribution?: KfzLandingAttribution
  mode?: 'production' | 'preview' | 'memory'
  storage?: KfzAnalyticsConsentStorage
  submitInquiry?: KfzLandingSubmitFn
  draftStorage?: KfzLandingDraftStorage | null
  analyticsOverride?: KfzLandingAnalyticsPort
}

export function KfzLandingWithAnalytics({
  attribution,
  mode = 'production',
  storage,
  submitInquiry,
  draftStorage,
  analyticsOverride,
}: KfzLandingWithAnalyticsProps) {
  if (analyticsOverride) {
    return (
      <KfzLandingForm
        attribution={attribution}
        analytics={analyticsOverride}
        submitInquiry={submitInquiry}
        draftStorage={draftStorage}
      />
    )
  }

  return (
    <KfzLandingAnalyticsRoot attribution={attribution} mode={mode} storage={storage}>
      {(analytics) => (
        <KfzLandingForm
          attribution={attribution}
          analytics={analytics}
          submitInquiry={submitInquiry}
          draftStorage={draftStorage}
        />
      )}
    </KfzLandingAnalyticsRoot>
  )
}
