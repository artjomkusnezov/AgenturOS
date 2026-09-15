import type { KfzLandingAttribution } from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import {
  emptyKfzAnalyticsTiming,
  tickKfzAnalyticsTiming,
  type KfzAnalyticsTimingSnapshot,
} from '@/features/inbound/kfz/lib/kfz-analytics-active-time'
import {
  isKfzAnalyticsBranchId,
  isKfzAnalyticsFieldId,
  isKfzAnalyticsStepId,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import {
  analyticsConsentAllowsPersist,
  readKfzAnalyticsConsent,
  readOrCreateKfzAnalyticsSessionId,
  writeKfzAnalyticsConsent,
  type KfzAnalyticsConsentStorage,
} from '@/features/inbound/kfz/lib/kfz-analytics-consent'
import { KFZ_ANALYTICS_EMITTED_STORAGE_KEY } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import {
  buildKfzAnalyticsEventKey,
  sanitizeKfzAnalyticsRecord,
} from '@/features/inbound/kfz/lib/kfz-analytics-redact'
import {
  isKfzAnalyticsBackTransitionAllowed,
  isKfzAnalyticsForwardTransitionAllowed,
} from '@/features/inbound/kfz/lib/kfz-analytics-quality'
import {
  clearKfzAnalyticsFirstSource,
  resolveKfzAnalyticsFirstSource,
  sanitizeKfzAnalyticsTrafficSource,
  type KfzAnalyticsTrafficSnapshot,
} from '@/features/inbound/kfz/lib/kfz-analytics-traffic-source'
import type {
  KfzAnalyticsConsentState,
  KfzAnalyticsErrorCategory,
  KfzAnalyticsEventName,
  KfzAnalyticsProperties,
  KfzAnalyticsRecord,
} from '@/features/inbound/kfz/types/kfz-analytics'

export type KfzAnalyticsControllerOptions = {
  storage: KfzAnalyticsConsentStorage
  attribution?: KfzLandingAttribution | null
  referrer?: string | null
  now?: () => number
  hidden?: () => boolean
  randomUuid?: () => string
}

function iso(now: number): string {
  return new Date(now).toISOString()
}

function readEmittedKeys(storage: KfzAnalyticsConsentStorage): Set<string> {
  try {
    const raw = storage.getItem(KFZ_ANALYTICS_EMITTED_STORAGE_KEY)
    if (!raw) {
      return new Set()
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return new Set()
    }
    return new Set(parsed.filter((entry): entry is string => typeof entry === 'string'))
  } catch {
    return new Set()
  }
}

function writeEmittedKeys(storage: KfzAnalyticsConsentStorage, keys: Set<string>) {
  storage.setItem(KFZ_ANALYTICS_EMITTED_STORAGE_KEY, JSON.stringify([...keys]))
}

export function createKfzAnalyticsController(options: KfzAnalyticsControllerOptions) {
  const storage = options.storage
  const now = options.now ?? (() => Date.now())
  const hidden = options.hidden ?? (() => false)
  let consent: KfzAnalyticsConsentState = readKfzAnalyticsConsent(storage)
  let sessionId = readOrCreateKfzAnalyticsSessionId(
    storage,
    consent,
    options.randomUuid,
  )
  let emitted = readEmittedKeys(storage)
  let timing: KfzAnalyticsTimingSnapshot = emptyKfzAnalyticsTiming()
  let submitted = false
  let abandoned = false
  let lastStepId: string | null = null
  let firstSource: KfzAnalyticsTrafficSnapshot = resolveKfzAnalyticsFirstSource({
    storage,
    consent,
    attribution: options.attribution,
    referrer: options.referrer,
  })

  function persistEmitted() {
    writeEmittedKeys(storage, emitted)
  }

  function flushTiming(stepId?: string | null) {
    timing = tickKfzAnalyticsTiming(timing, {
      now: now(),
      hidden: hidden(),
      stepId,
    })
  }

  function emit(
    eventName: KfzAnalyticsEventName,
    properties: KfzAnalyticsProperties = {},
  ): KfzAnalyticsRecord | null {
    if (!analyticsConsentAllowsPersist(consent) || !sessionId) {
      return null
    }
    const eventKey = buildKfzAnalyticsEventKey(sessionId, eventName, properties)
    if (emitted.has(eventKey)) {
      return null
    }
    const record = sanitizeKfzAnalyticsRecord(
      {
        eventName,
        sessionId,
        occurredAt: iso(now()),
        properties,
        eventKey,
      },
      iso(now()),
    )
    if (!record) {
      return null
    }
    emitted.add(record.eventKey)
    persistEmitted()
    return record
  }

  function touchActiveMs(
    eventName: Extract<KfzAnalyticsEventName, 'landing_view' | 'step_view'>,
    properties: KfzAnalyticsProperties,
  ): KfzAnalyticsRecord | null {
    if (!analyticsConsentAllowsPersist(consent) || !sessionId) {
      return null
    }
    flushTiming(properties.stepId ?? timing.currentStepId)
    const eventKey = buildKfzAnalyticsEventKey(sessionId, eventName, properties)
    const record = sanitizeKfzAnalyticsRecord(
      {
        eventName,
        sessionId,
        occurredAt: iso(now()),
        properties: {
          ...properties,
          activeMs:
            eventName === 'landing_view'
              ? timing.totalActiveMs
              : properties.stepId
                ? (timing.stepActiveMs[properties.stepId] ?? 0)
                : timing.totalActiveMs,
        },
        eventKey,
      },
      iso(now()),
    )
    if (!record) {
      return null
    }
    emitted.add(record.eventKey)
    persistEmitted()
    return record
  }

  function recordLandingView(): KfzAnalyticsRecord[] {
    if (!analyticsConsentAllowsPersist(consent) || !sessionId) {
      return []
    }
    flushTiming(timing.currentStepId ?? 'branch')
    const records: KfzAnalyticsRecord[] = []
    const landing = emit('landing_view', { activeMs: timing.totalActiveMs })
    if (landing) {
      records.push(landing)
    }
    firstSource = resolveKfzAnalyticsFirstSource({
      storage,
      consent,
      attribution: options.attribution,
      referrer: options.referrer,
    })
    const source = emit('traffic_source', {
      trafficSource: firstSource.trafficSource,
      ...(firstSource.referrerCategory
        ? { referrerCategory: firstSource.referrerCategory }
        : {}),
      ...(firstSource.utmSource ? { utmSource: firstSource.utmSource } : {}),
      ...(firstSource.utmCampaign ? { utmCampaign: firstSource.utmCampaign } : {}),
    })
    if (source) {
      records.push(source)
    }
    return records
  }

  return {
    getConsent(): KfzAnalyticsConsentState {
      return consent
    },
    getSessionId(): string | null {
      return sessionId
    },
    getFirstSource(): KfzAnalyticsTrafficSnapshot {
      return firstSource
    },
    setConsent(next: Exclude<KfzAnalyticsConsentState, 'unknown'>): KfzAnalyticsRecord[] {
      writeKfzAnalyticsConsent(storage, next)
      consent = next
      if (next === 'declined') {
        sessionId = null
        emitted = new Set()
        storage.removeItem(KFZ_ANALYTICS_EMITTED_STORAGE_KEY)
        clearKfzAnalyticsFirstSource(storage)
        firstSource = sanitizeKfzAnalyticsTrafficSource(
          options.attribution,
          options.referrer,
        )
        timing = emptyKfzAnalyticsTiming()
        return []
      }
      sessionId = readOrCreateKfzAnalyticsSessionId(
        storage,
        consent,
        options.randomUuid,
      )
      firstSource = resolveKfzAnalyticsFirstSource({
        storage,
        consent,
        attribution: options.attribution,
        referrer: options.referrer,
      })
      return recordLandingView()
    },
    recordLandingView,
    recordStepView(stepId: string): KfzAnalyticsRecord[] {
      if (!isKfzAnalyticsStepId(stepId)) {
        return []
      }
      const fromStepId =
        lastStepId &&
        lastStepId !== stepId &&
        isKfzAnalyticsStepId(lastStepId) &&
        isKfzAnalyticsForwardTransitionAllowed(lastStepId, stepId)
          ? lastStepId
          : undefined
      flushTiming(stepId)
      lastStepId = stepId
      const record = emit('step_view', {
        stepId,
        ...(fromStepId ? { fromStepId } : {}),
        activeMs: timing.stepActiveMs[stepId] ?? 0,
      })
      return record ? [record] : []
    },
    recordStepCompleted(stepId: string): KfzAnalyticsRecord[] {
      if (!isKfzAnalyticsStepId(stepId)) {
        return []
      }
      flushTiming(stepId)
      const record = emit('step_completed', {
        stepId,
        activeMs: timing.stepActiveMs[stepId] ?? 0,
      })
      return record ? [record] : []
    },
    recordFunnelStart(branchId: string): KfzAnalyticsRecord[] {
      if (!isKfzAnalyticsBranchId(branchId)) {
        return []
      }
      flushTiming(timing.currentStepId)
      const records: KfzAnalyticsRecord[] = []
      const start = emit('funnel_start', {
        branchId,
        activeMs: timing.totalActiveMs,
      })
      if (start) {
        records.push(start)
      }
      const branch = emit('initial_branch_selected', { branchId })
      if (branch) {
        records.push(branch)
      }
      return records
    },
    recordBackNavigation(fromStepId: string, toStepId: string): KfzAnalyticsRecord[] {
      if (!isKfzAnalyticsStepId(fromStepId) || !isKfzAnalyticsStepId(toStepId)) {
        return []
      }
      if (!isKfzAnalyticsBackTransitionAllowed(fromStepId, toStepId)) {
        return []
      }
      flushTiming(toStepId)
      lastStepId = toStepId
      const record = emit('back_navigation', {
        fromStepId,
        stepId: toStepId,
      })
      return record ? [record] : []
    },
    recordValidationBlocked(stepId: string, fieldId: string): KfzAnalyticsRecord[] {
      if (!isKfzAnalyticsStepId(stepId)) {
        return []
      }
      const safeField = isKfzAnalyticsFieldId(fieldId) ? fieldId : 'missing_field'
      const record = emit('validation_blocked', { stepId, fieldId: safeField })
      return record ? [record] : []
    },
    recordSubmitStarted(): KfzAnalyticsRecord[] {
      const record = emit('submit_started', { activeMs: timing.totalActiveMs })
      return record ? [record] : []
    },
    recordSubmitFailed(errorCategory: KfzAnalyticsErrorCategory): KfzAnalyticsRecord[] {
      const record = emit('submit_failed', { errorCategory })
      return record ? [record] : []
    },
    recordSubmitSucceeded(): KfzAnalyticsRecord[] {
      submitted = true
      flushTiming(timing.currentStepId)
      const record = emit('submit_succeeded', { activeMs: timing.totalActiveMs })
      return record ? [record] : []
    },
    recordAbandoned(): KfzAnalyticsRecord[] {
      if (submitted || abandoned) {
        return []
      }
      if (!analyticsConsentAllowsPersist(consent) || !sessionId) {
        return []
      }
      flushTiming(timing.currentStepId)
      abandoned = true
      const record = emit('funnel_abandoned', {
        lastStepId: lastStepId && isKfzAnalyticsStepId(lastStepId) ? lastStepId : 'branch',
        activeMs: timing.totalActiveMs,
      })
      return record ? [record] : []
    },
    flushActiveTime(): KfzAnalyticsRecord[] {
      if (!analyticsConsentAllowsPersist(consent)) {
        return []
      }
      const records: KfzAnalyticsRecord[] = []
      const landing = touchActiveMs('landing_view', {})
      if (landing) {
        records.push(landing)
      }
      if (timing.currentStepId) {
        const step = touchActiveMs('step_view', { stepId: timing.currentStepId })
        if (step) {
          records.push(step)
        }
      }
      return records
    },
    onVisibilityChange(isHidden: boolean): KfzAnalyticsRecord[] {
      timing = tickKfzAnalyticsTiming(timing, {
        now: now(),
        hidden: isHidden,
        stepId: timing.currentStepId,
      })
      return []
    },
    getTiming(): KfzAnalyticsTimingSnapshot {
      return tickKfzAnalyticsTiming(timing, {
        now: now(),
        hidden: hidden(),
        stepId: timing.currentStepId,
      })
    },
  }
}

export type KfzAnalyticsController = ReturnType<typeof createKfzAnalyticsController>
