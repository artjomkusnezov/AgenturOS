import {
  isKfzAnalyticsPropertyKey,
  isKfzAnalyticsReferrerCategory,
  isKfzAnalyticsSessionId,
  isKfzAnalyticsStepId,
  isKfzAnalyticsTrafficSource,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import { KFZ_ANALYTICS_ACTIVE_MS_CAP } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import {
  KFZ_ANALYTICS_FORBIDDEN_PROPERTY_EXAMPLES,
  looksLikeForbiddenAnalyticsKey,
} from '@/features/inbound/kfz/lib/kfz-analytics-redact'
import type { KfzAnalyticsSessionFacts } from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import {
  emptyKfzAnalyticsHealthFacts,
  resolveKfzAnalyticsHealthStatus,
} from '@/features/inbound/kfz/lib/kfz-analytics-health'
import type {
  KfzAnalyticsDataQuality,
  KfzAnalyticsHealthSnapshot,
  KfzAnalyticsIngestQuality,
  KfzAnalyticsRecord,
  KfzAnalyticsReviewStatus,
} from '@/features/inbound/kfz/types/kfz-analytics'

const CANONICAL_STEP_ORDER = [
  'branch',
  'intent',
  'registration',
  'vehicle',
  'ownership',
  'usage',
  'drivers',
  'insurance',
  'claims',
  'coverage',
  'contact',
  'documents',
] as const

const CANONICAL_INDEX = new Map<string, number>(
  CANONICAL_STEP_ORDER.map((stepId, index) => [stepId, index]),
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function canonicalIndex(stepId: string): number {
  return CANONICAL_INDEX.get(stepId) ?? -1
}

/**
 * Forward edges that can occur on at least one of the six Kfz paths.
 * Questionnaire screens may be skipped when they have no visible questions,
 * so later question screens and contact are allowed. Documents is only
 * reachable from contact on the upload path.
 */
export function isKfzAnalyticsForwardTransitionAllowed(
  fromStepId: string,
  toStepId: string,
): boolean {
  if (!isKfzAnalyticsStepId(fromStepId) || !isKfzAnalyticsStepId(toStepId)) {
    return false
  }
  if (fromStepId === toStepId) {
    return false
  }
  if (fromStepId === 'documents') {
    return false
  }
  if (toStepId === 'documents') {
    return fromStepId === 'contact'
  }
  if (fromStepId === 'branch') {
    return toStepId === 'intent' || toStepId === 'registration' || toStepId === 'contact'
  }
  if (fromStepId === 'contact') {
    return false
  }
  const fromIndex = canonicalIndex(fromStepId)
  const toIndex = canonicalIndex(toStepId)
  return fromIndex >= 0 && toIndex > fromIndex
}

export function isKfzAnalyticsBackTransitionAllowed(
  fromStepId: string,
  toStepId: string,
): boolean {
  if (!isKfzAnalyticsStepId(fromStepId) || !isKfzAnalyticsStepId(toStepId)) {
    return false
  }
  if (fromStepId === toStepId) {
    return false
  }
  return (
    isKfzAnalyticsForwardTransitionAllowed(toStepId, fromStepId) ||
    canonicalIndex(toStepId) < canonicalIndex(fromStepId)
  )
}

export function isKfzAnalyticsTransitionAllowed(
  fromStepId: string,
  toStepId: string,
  kind: 'forward' | 'back' = 'forward',
): boolean {
  return kind === 'back'
    ? isKfzAnalyticsBackTransitionAllowed(fromStepId, toStepId)
    : isKfzAnalyticsForwardTransitionAllowed(fromStepId, toStepId)
}

export function classifyKfzAnalyticsActiveMs(value: unknown): {
  activeMs?: number
  rejected: 'invalid' | 'extreme' | null
} {
  if (value == null) {
    return { rejected: null }
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { rejected: 'invalid' }
  }
  if (value < 0) {
    return { rejected: 'invalid' }
  }
  if (value > KFZ_ANALYTICS_ACTIVE_MS_CAP) {
    return { rejected: 'extreme' }
  }
  return { activeMs: Math.round(value), rejected: null }
}

export function emptyKfzAnalyticsIngestQuality(): KfzAnalyticsIngestQuality {
  return {
    consentBlocked: 0,
    accepted: 0,
    rejected: 0,
    duplicates: 0,
    transientFailed: 0,
    retryRecovered: 0,
    invalidTransitions: 0,
    rejectedTimings: 0,
    missingSessionMetadata: 0,
    malformedSourceCategories: 0,
    redactedForbiddenFields: 0,
  }
}

export function emptyKfzAnalyticsDataQuality(
  status: KfzAnalyticsReviewStatus = 'empty',
): KfzAnalyticsDataQuality {
  const loadStatus =
    status === 'unavailable' || status === 'configuration_missing' ? status : 'ready'
  return {
    available: status === 'ready' || status === 'empty',
    status,
    healthStatus: resolveKfzAnalyticsHealthStatus({ loadStatus }),
    ingestHealthAvailable: false,
    acceptedEvents: 0,
    rejectedEvents: 0,
    duplicateEvents: 0,
    transientFailedEvents: 0,
    retryRecoveredEvents: 0,
    invalidTransitions: 0,
    rejectedTimings: 0,
    missingSessionMetadata: 0,
    malformedSourceCategories: 0,
    incompleteSessions: 0,
  }
}

export function unavailableKfzAnalyticsDataQuality(
  status: Extract<KfzAnalyticsReviewStatus, 'unavailable' | 'configuration_missing'>,
): KfzAnalyticsDataQuality {
  return {
    ...emptyKfzAnalyticsDataQuality(status),
    available: false,
    healthStatus: resolveKfzAnalyticsHealthStatus({ loadStatus: status }),
    ingestHealthAvailable: false,
  }
}

function rawProperties(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) {
    return null
  }
  return isRecord(raw.properties) ? raw.properties : null
}

export function countForbiddenAnalyticsPropertyKeys(raw: unknown): number {
  const properties = rawProperties(raw)
  if (!properties) {
    return 0
  }
  let count = 0
  for (const key of Object.keys(properties)) {
    if (isKfzAnalyticsPropertyKey(key)) {
      continue
    }
    if (looksLikeForbiddenAnalyticsKey(key)) {
      count += 1
      continue
    }
    if (
      (KFZ_ANALYTICS_FORBIDDEN_PROPERTY_EXAMPLES as readonly string[]).includes(key)
    ) {
      count += 1
    }
  }
  return count
}

export function rawEventHasMalformedSourceCategory(raw: unknown): boolean {
  const properties = rawProperties(raw)
  if (!properties) {
    return false
  }
  if (
    'trafficSource' in properties &&
    !isKfzAnalyticsTrafficSource(properties.trafficSource)
  ) {
    return true
  }
  if (
    'referrerCategory' in properties &&
    !isKfzAnalyticsReferrerCategory(properties.referrerCategory)
  ) {
    return true
  }
  return (
    typeof properties.referrer === 'string' ||
    typeof properties.url === 'string' ||
    typeof properties.href === 'string' ||
    typeof properties.query === 'string'
  )
}

export function rawEventHasInvalidTransition(raw: unknown): boolean {
  if (!isRecord(raw)) {
    return false
  }
  const eventName = raw.eventName
  const properties = rawProperties(raw)
  if (!properties) {
    return false
  }
  const fromStepId =
    typeof properties.fromStepId === 'string' ? properties.fromStepId : ''
  const toStepId =
    typeof properties.stepId === 'string' ? properties.stepId : ''
  if (!fromStepId || !toStepId) {
    return false
  }
  if (eventName === 'back_navigation') {
    return !isKfzAnalyticsBackTransitionAllowed(fromStepId, toStepId)
  }
  if (eventName === 'step_view') {
    return !isKfzAnalyticsForwardTransitionAllowed(fromStepId, toStepId)
  }
  return false
}

export function recordHasInvalidTransition(record: KfzAnalyticsRecord): boolean {
  const fromStepId = record.properties.fromStepId
  const toStepId = record.properties.stepId
  if (!fromStepId || !toStepId) {
    return false
  }
  if (record.eventName === 'back_navigation') {
    return !isKfzAnalyticsBackTransitionAllowed(fromStepId, toStepId)
  }
  if (record.eventName === 'step_view') {
    return !isKfzAnalyticsForwardTransitionAllowed(fromStepId, toStepId)
  }
  return false
}

export function rawEventHasRejectedTiming(raw: unknown): boolean {
  const properties = rawProperties(raw)
  if (!properties || !('activeMs' in properties)) {
    return false
  }
  return classifyKfzAnalyticsActiveMs(properties.activeMs).rejected !== null
}

export function recordHasRejectedTiming(record: KfzAnalyticsRecord): boolean {
  if (!('activeMs' in record.properties)) {
    return false
  }
  return classifyKfzAnalyticsActiveMs(record.properties.activeMs).rejected !== null
}

export function rawEventMissingSessionMetadata(raw: unknown): boolean {
  if (!isRecord(raw)) {
    return true
  }
  if (!isKfzAnalyticsSessionId(raw.sessionId)) {
    return true
  }
  const eventName = raw.eventName
  const properties = rawProperties(raw) ?? {}
  if (
    (eventName === 'step_view' ||
      eventName === 'step_completed' ||
      eventName === 'back_navigation') &&
    !isKfzAnalyticsStepId(properties.stepId)
  ) {
    return true
  }
  if (
    (eventName === 'funnel_start' || eventName === 'initial_branch_selected') &&
    typeof properties.branchId !== 'string'
  ) {
    return true
  }
  if (
    eventName === 'traffic_source' &&
    !isKfzAnalyticsTrafficSource(properties.trafficSource) &&
    !isKfzAnalyticsReferrerCategory(properties.referrerCategory)
  ) {
    return true
  }
  return false
}

export function sessionHasMissingMetadata(facts: KfzAnalyticsSessionFacts): boolean {
  const names = new Set(facts.events.map((event) => event.eventName))
  if (!names.has('landing_view')) {
    return true
  }
  if (!names.has('traffic_source')) {
    return true
  }
  if (facts.trafficSource === 'unknown' && facts.referrerCategory === 'unknown') {
    return true
  }
  return false
}

export function sessionIsIncomplete(facts: KfzAnalyticsSessionFacts): boolean {
  return !facts.submitted && !facts.abandoned
}


export function summarizeKfzAnalyticsDataQuality(input: {
  events: readonly KfzAnalyticsRecord[]
  uniqueEventCount: number
  sessions: readonly KfzAnalyticsSessionFacts[]
  empty: boolean
  ingestHealth?: KfzAnalyticsHealthSnapshot | null
}): KfzAnalyticsDataQuality {
  let invalidTransitions = 0
  let rejectedTimings = 0
  let malformedSourceCategories = 0

  for (const event of input.events) {
    if (recordHasInvalidTransition(event)) {
      invalidTransitions += 1
    }
    if (recordHasRejectedTiming(event)) {
      rejectedTimings += 1
    }
    if (
      event.eventName === 'traffic_source' &&
      event.properties.trafficSource == null &&
      event.properties.referrerCategory == null
    ) {
      malformedSourceCategories += 1
    }
  }

  const missingSessionMetadata = input.sessions.filter(sessionHasMissingMetadata).length
  const incompleteSessions = input.sessions.filter(sessionIsIncomplete).length
  const derivedDuplicates = Math.max(0, input.events.length - input.uniqueEventCount)
  const ingest = input.ingestHealth?.available
    ? input.ingestHealth.facts
    : emptyKfzAnalyticsHealthFacts()
  const ingestHealthAvailable = input.ingestHealth?.available === true
  const duplicateEvents = ingestHealthAvailable ? ingest.duplicates : derivedDuplicates
  const empty = input.empty
  const status: KfzAnalyticsReviewStatus = empty ? 'empty' : 'ready'

  return {
    available: true,
    status,
    healthStatus: resolveKfzAnalyticsHealthStatus({
      loadStatus: 'ready',
      facts: ingestHealthAvailable
        ? ingest
        : { ...emptyKfzAnalyticsHealthFacts(), accepted: input.uniqueEventCount },
      ingestAvailable: ingestHealthAvailable,
    }),
    ingestHealthAvailable,
    acceptedEvents: input.uniqueEventCount,
    rejectedEvents: ingestHealthAvailable ? ingest.rejected : 0,
    duplicateEvents,
    transientFailedEvents: ingestHealthAvailable ? ingest.transientFailed : 0,
    retryRecoveredEvents: ingestHealthAvailable ? ingest.retryRecovered : 0,
    invalidTransitions,
    rejectedTimings,
    missingSessionMetadata,
    malformedSourceCategories,
    incompleteSessions,
  }
}

export function kfzAnalyticsDataQualityCopy(quality: KfzAnalyticsDataQuality): {
  title: string
  body: string
} {
  if (!quality.available && quality.status === 'configuration_missing') {
    return {
      title: 'Datenqualität nicht verfügbar',
      body: 'Die Messung ist nicht konfiguriert. Es werden keine Qualitätswerte erfunden.',
    }
  }
  if (!quality.available) {
    return {
      title: 'Datenqualität nicht verfügbar',
      body: 'Die Messdaten sind gerade nicht verfügbar. Es werden keine Qualitätswerte erfunden.',
    }
  }
  if (quality.status === 'empty') {
    return {
      title: 'Datenqualität',
      body: 'Keine anonymen Ereignisse in dieser Auswahl. Duplikate, Ablehnungen, vorübergehende Fehler und Zeiten werden nicht hochgerechnet.',
    }
  }
  return {
    title: 'Datenqualität',
    body: 'Nur Metadaten: akzeptiert, abgelehnt, doppelt, vorübergehend fehlgeschlagen, unmögliche Übergänge, verworfene Zeiten. Keine Antworten, keine Kontakte.',
  }
}
