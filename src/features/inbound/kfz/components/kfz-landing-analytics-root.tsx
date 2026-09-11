'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { recordKfzAnalyticsPreviewAction } from '@/features/inbound/kfz/actions/kfz-analytics-preview'
import { KfzAnalyticsConsentBanner } from '@/features/inbound/kfz/components/kfz-analytics-consent-banner'
import { classifyKfzAnalyticsSubmitError } from '@/features/inbound/kfz/lib/kfz-analytics-aggregate'
import {
  createMemoryKfzAnalyticsConsentStorage,
  getSessionKfzAnalyticsStorage,
  type KfzAnalyticsConsentStorage,
} from '@/features/inbound/kfz/lib/kfz-analytics-consent'
import {
  createKfzAnalyticsController,
  type KfzAnalyticsController,
} from '@/features/inbound/kfz/lib/kfz-analytics-session'
import type { KfzLandingAttribution } from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import {
  isKfzAnalyticsRetryableSendStatus,
  sendKfzAnalyticsRecordsWithRetry,
} from '@/features/inbound/kfz/lib/kfz-analytics-health'
import type { KfzAnalyticsRecord } from '@/features/inbound/kfz/types/kfz-analytics'

export type KfzLandingAnalyticsPort = {
  onLanding(): void
  onBranchSelected(branchId: string): void
  onStepView(stepId: string): void
  onStepCompleted(stepId: string): void
  onBack(fromStepId: string, toStepId: string): void
  onValidationBlocked(stepId: string, fieldId: string): void
  onSubmitStarted(): void
  onSubmitFailed(code: string | null | undefined): void
  onSubmitSucceeded(): void
  onAbandon(): void
}

export function createNoopKfzLandingAnalytics(): KfzLandingAnalyticsPort {
  return {
    onLanding() {},
    onBranchSelected() {},
    onStepView() {},
    onStepCompleted() {},
    onBack() {},
    onValidationBlocked() {},
    onSubmitStarted() {},
    onSubmitFailed() {},
    onSubmitSucceeded() {},
    onAbandon() {},
  }
}

const NOOP_KFZ_LANDING_ANALYTICS = createNoopKfzLandingAnalytics()

export function getNoopKfzLandingAnalytics(): KfzLandingAnalyticsPort {
  return NOOP_KFZ_LANDING_ANALYTICS
}

type TransportMode = 'production' | 'preview' | 'memory'

async function postKfzAnalyticsRecords(
  consent: 'granted' | 'declined' | 'unknown',
  records: readonly KfzAnalyticsRecord[],
) {
  const body = JSON.stringify({ consent, events: records })
  const response = await fetch('/api/inbound/kfz-analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  })
  if (isKfzAnalyticsRetryableSendStatus(response.status)) {
    throw new Error(`analytics persist ${response.status}`)
  }
}

async function sendRecords(
  mode: TransportMode,
  records: KfzAnalyticsRecord[],
  readConsent: () => 'granted' | 'declined' | 'unknown',
) {
  if (records.length === 0) {
    return
  }
  await sendKfzAnalyticsRecordsWithRetry({
    consent: readConsent,
    records,
    send: async (nextConsent, nextRecords) => {
      if (nextConsent !== 'granted' || nextRecords.length === 0) {
        return
      }
      if (mode === 'memory') {
        return
      }
      if (mode === 'preview') {
        await recordKfzAnalyticsPreviewAction({
          consent: nextConsent,
          events: [...nextRecords],
        })
        return
      }
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          const blob = new Blob([JSON.stringify({ consent: nextConsent, events: nextRecords })], {
            type: 'application/json',
          })
          const queued = navigator.sendBeacon('/api/inbound/kfz-analytics', blob)
          if (queued) {
            return
          }
        }
      }
      await postKfzAnalyticsRecords(nextConsent, nextRecords)
    },
  })
}

export function bindKfzAnalyticsPort(
  controller: KfzAnalyticsController,
  flush: (records: KfzAnalyticsRecord[]) => void,
): KfzLandingAnalyticsPort {
  const push = (records: KfzAnalyticsRecord[]) => {
    if (records.length > 0) {
      flush(records)
    }
  }
  return {
    onLanding() {
      push(controller.recordLandingView())
    },
    onBranchSelected(branchId) {
      push(controller.recordFunnelStart(branchId))
    },
    onStepView(stepId) {
      push(controller.recordStepView(stepId))
    },
    onStepCompleted(stepId) {
      push(controller.recordStepCompleted(stepId))
    },
    onBack(fromStepId, toStepId) {
      push(controller.recordBackNavigation(fromStepId, toStepId))
    },
    onValidationBlocked(stepId, fieldId) {
      push(controller.recordValidationBlocked(stepId, fieldId))
    },
    onSubmitStarted() {
      push(controller.recordSubmitStarted())
    },
    onSubmitFailed(code) {
      push(controller.recordSubmitFailed(classifyKfzAnalyticsSubmitError(code)))
    },
    onSubmitSucceeded() {
      push(controller.recordSubmitSucceeded())
    },
    onAbandon() {
      push(controller.recordAbandoned())
    },
  }
}

type KfzLandingAnalyticsRootProps = {
  attribution?: KfzLandingAttribution
  mode?: TransportMode
  storage?: KfzAnalyticsConsentStorage
  children: (analytics: KfzLandingAnalyticsPort) => ReactNode
}

export function KfzLandingAnalyticsRoot({
  attribution,
  mode = 'production',
  storage,
  children,
}: KfzLandingAnalyticsRootProps) {
  const resolvedStorage = useMemo(
    () => storage ?? getSessionKfzAnalyticsStorage() ?? createMemoryKfzAnalyticsConsentStorage(),
    [storage],
  )
  const visibility = useMemo(() => ({ hidden: false }), [])
  const controller = useMemo(
    () =>
      createKfzAnalyticsController({
        storage: resolvedStorage,
        attribution,
        referrer: typeof document !== 'undefined' ? document.referrer : null,
        hidden: () => visibility.hidden,
      }),
    [attribution, resolvedStorage, visibility],
  )
  const flush = useCallback(
    (records: KfzAnalyticsRecord[]) => {
      void sendRecords(mode, records, () => controller.getConsent())
    },
    [controller, mode],
  )
  const analytics = useMemo(
    () => bindKfzAnalyticsPort(controller, flush),
    [controller, flush],
  )
  const [consent, setConsentState] = useState(() => controller.getConsent())

  useEffect(() => {
    if (consent === 'granted') {
      analytics.onLanding()
    }
  }, [analytics, consent])

  useEffect(() => {
    function onVisibility() {
      visibility.hidden = document.visibilityState !== 'visible'
      controller.onVisibilityChange(visibility.hidden)
      if (visibility.hidden) {
        flush(controller.flushActiveTime())
      }
    }
    function onPageHide() {
      visibility.hidden = true
      analytics.onAbandon()
      flush(controller.flushActiveTime())
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [analytics, controller, flush, visibility])

  return (
    <div className="space-y-4">
      <KfzAnalyticsConsentBanner
        consent={consent}
        onGrant={() => {
          const records = controller.setConsent('granted')
          setConsentState('granted')
          flush(records)
        }}
        onDecline={() => {
          controller.setConsent('declined')
          setConsentState('declined')
        }}
      />
      {children(analytics)}
    </div>
  )
}
