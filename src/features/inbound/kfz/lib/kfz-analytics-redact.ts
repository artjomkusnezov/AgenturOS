import {
  isKfzAnalyticsBranchId,
  isKfzAnalyticsErrorCategory,
  isKfzAnalyticsEventName,
  isKfzAnalyticsFieldId,
  isKfzAnalyticsPropertyKey,
  isKfzAnalyticsSessionId,
  isKfzAnalyticsStepId,
  isKfzAnalyticsTrafficSource,
  sanitizeKfzAnalyticsUtmCampaign,
  sanitizeKfzAnalyticsUtmSource,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import { KFZ_ANALYTICS_ACTIVE_MS_CAP } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import type {
  KfzAnalyticsEventName,
  KfzAnalyticsProperties,
  KfzAnalyticsRecord,
} from '@/features/inbound/kfz/types/kfz-analytics'

const FORBIDDEN_KEY_FRAGMENTS = [
  'name',
  'phone',
  'email',
  'mail',
  'plate',
  'kennzeichen',
  'ip',
  'agent',
  'ua',
  'url',
  'href',
  'query',
  'answer',
  'payload',
  'file',
  'filename',
  'document',
  'text',
  'note',
  'message',
  'vehicle',
  'hsn',
  'tsn',
  'dob',
  'address',
  'postal',
  'city',
  'token',
  'secret',
  'cookie',
  'fingerprint',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function looksLikeForbiddenKey(key: string): boolean {
  const lowered = key.toLowerCase()
  return FORBIDDEN_KEY_FRAGMENTS.some((fragment) => lowered.includes(fragment))
}

function looksLikePersonalValue(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }
  if (trimmed.includes('@') && /\S+@\S+\.\S+/.test(trimmed)) {
    return true
  }
  if (/https?:\/\//i.test(trimmed) || trimmed.includes('?')) {
    return true
  }
  if (trimmed.length > 64) {
    return true
  }
  const digits = trimmed.replace(/[^\d]/g, '')
  if (digits.length >= 7 && /[\d+\s()./-]{7,}/.test(trimmed)) {
    return true
  }
  return false
}

function sanitizeActiveMs(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined
  }
  return Math.min(Math.round(value), KFZ_ANALYTICS_ACTIVE_MS_CAP)
}

export function redactKfzAnalyticsProperties(
  raw: unknown,
): KfzAnalyticsProperties {
  if (!isRecord(raw)) {
    return {}
  }

  const properties: KfzAnalyticsProperties = {}

  for (const [key, value] of Object.entries(raw)) {
    if (looksLikeForbiddenKey(key) && !isKfzAnalyticsPropertyKey(key)) {
      continue
    }
    if (!isKfzAnalyticsPropertyKey(key)) {
      continue
    }

    if (key === 'activeMs') {
      const activeMs = sanitizeActiveMs(value)
      if (activeMs !== undefined) {
        properties.activeMs = activeMs
      }
      continue
    }

    if (typeof value !== 'string') {
      continue
    }
    if (looksLikePersonalValue(value)) {
      continue
    }

    if (key === 'stepId' || key === 'fromStepId' || key === 'lastStepId') {
      if (isKfzAnalyticsStepId(value)) {
        properties[key] = value
      }
      continue
    }
    if (key === 'branchId') {
      if (isKfzAnalyticsBranchId(value)) {
        properties.branchId = value
      }
      continue
    }
    if (key === 'trafficSource') {
      if (isKfzAnalyticsTrafficSource(value)) {
        properties.trafficSource = value
      }
      continue
    }
    if (key === 'utmSource') {
      const sanitized = sanitizeKfzAnalyticsUtmSource(value)
      if (sanitized) {
        properties.utmSource = sanitized
      }
      continue
    }
    if (key === 'utmCampaign') {
      const sanitized = sanitizeKfzAnalyticsUtmCampaign(value)
      if (sanitized) {
        properties.utmCampaign = sanitized
      }
      continue
    }
    if (key === 'fieldId') {
      if (isKfzAnalyticsFieldId(value)) {
        properties.fieldId = value
      }
      continue
    }
    if (key === 'errorCategory') {
      if (isKfzAnalyticsErrorCategory(value)) {
        properties.errorCategory = value
      }
    }
  }

  return properties
}

export function buildKfzAnalyticsEventKey(
  sessionId: string,
  eventName: KfzAnalyticsEventName,
  properties: KfzAnalyticsProperties,
): string {
  if (eventName === 'step_view' || eventName === 'step_completed') {
    return `${sessionId}:${eventName}:${properties.stepId ?? 'unknown'}`
  }
  if (eventName === 'back_navigation') {
    return `${sessionId}:${eventName}:${properties.fromStepId ?? 'unknown'}:${properties.stepId ?? 'unknown'}`
  }
  if (eventName === 'validation_blocked') {
    return `${sessionId}:${eventName}:${properties.stepId ?? 'unknown'}:${properties.fieldId ?? 'unknown'}`
  }
  if (eventName === 'submit_failed') {
    return `${sessionId}:${eventName}:${properties.errorCategory ?? 'unknown'}`
  }
  return `${sessionId}:${eventName}`
}

export type SanitizeKfzAnalyticsInput = {
  eventName?: unknown
  sessionId?: unknown
  occurredAt?: unknown
  properties?: unknown
  eventKey?: unknown
}

export function sanitizeKfzAnalyticsRecord(
  input: SanitizeKfzAnalyticsInput,
  nowIso: string,
): KfzAnalyticsRecord | null {
  if (!isKfzAnalyticsEventName(input.eventName)) {
    return null
  }
  if (!isKfzAnalyticsSessionId(input.sessionId)) {
    return null
  }

  const properties = redactKfzAnalyticsProperties(input.properties)
  const occurredAt =
    typeof input.occurredAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(input.occurredAt)
      ? input.occurredAt
      : nowIso

  const eventKey =
    typeof input.eventKey === 'string' &&
    input.eventKey.startsWith(`${input.sessionId}:`) &&
    input.eventKey.length <= 180
      ? input.eventKey
      : buildKfzAnalyticsEventKey(input.sessionId, input.eventName, properties)

  return {
    eventName: input.eventName,
    eventKey,
    sessionId: input.sessionId,
    occurredAt,
    properties,
  }
}

export function assertNoKfzAnalyticsPii(record: KfzAnalyticsRecord): string[] {
  const leaks: string[] = []
  const serialized = JSON.stringify(record)
  const probes = [
    /@/,
    /\+49\d{6,}/,
    /user-agent/i,
    /https?:\/\//i,
    /license[_-]?plate/i,
    /kennzeichen/i,
    /"answers"/i,
    /"fullName"/i,
    /"filename"/i,
  ]
  for (const probe of probes) {
    if (probe.test(serialized)) {
      leaks.push(probe.source)
    }
  }
  for (const key of Object.keys(record.properties)) {
    if (!isKfzAnalyticsPropertyKey(key)) {
      leaks.push(`property:${key}`)
    }
  }
  return leaks
}
