'use client'

import {
  getNoopKfzLandingAnalytics,
  type KfzLandingAnalyticsPort,
} from '@/features/inbound/kfz/components/kfz-landing-analytics-root'
import { KfzLandingForm } from '@/features/inbound/kfz/components/kfz-landing-form'
import type { KfzLandingAttribution } from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import type { KfzLandingDraftStorage } from '@/features/inbound/kfz/lib/kfz-landing-draft'
import type { KfzLandingSubmitFn } from '@/features/inbound/kfz/lib/kfz-landing-submit-session'

type KfzLandingWithAnalyticsProps = {
  attribution?: KfzLandingAttribution
  mode?: 'production' | 'preview' | 'memory'
  submitInquiry?: KfzLandingSubmitFn
  draftStorage?: KfzLandingDraftStorage | null
  analyticsOverride?: KfzLandingAnalyticsPort
}

export function KfzLandingWithAnalytics({
  attribution,
  submitInquiry,
  draftStorage,
  analyticsOverride,
}: KfzLandingWithAnalyticsProps) {
  return (
    <KfzLandingForm
      attribution={attribution}
      analytics={analyticsOverride ?? getNoopKfzLandingAnalytics()}
      submitInquiry={submitInquiry}
      draftStorage={draftStorage}
    />
  )
}
