import {
  KFZ_ANALYTICS_CONSENT_STORAGE_KEY,
  KFZ_ANALYTICS_CONSENT_VERSION,
  KFZ_ANALYTICS_FIRST_SOURCE_STORAGE_KEY,
  KFZ_ANALYTICS_SESSION_STORAGE_KEY,
} from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import { isKfzAnalyticsSessionId } from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import type { KfzAnalyticsConsentState } from '@/features/inbound/kfz/types/kfz-analytics'

export type KfzAnalyticsConsentStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type KfzAnalyticsConsentSnapshot = {
  state: KfzAnalyticsConsentState
  version: typeof KFZ_ANALYTICS_CONSENT_VERSION
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function createMemoryKfzAnalyticsConsentStorage(
  seed: Record<string, string> = {},
): KfzAnalyticsConsentStorage & { data: Record<string, string> } {
  const data = { ...seed }
  return {
    data,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
    },
    setItem(key, value) {
      data[key] = value
    },
    removeItem(key) {
      delete data[key]
    },
  }
}

export function getSessionKfzAnalyticsStorage(): KfzAnalyticsConsentStorage | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function readKfzAnalyticsConsent(
  storage: KfzAnalyticsConsentStorage | null | undefined,
): KfzAnalyticsConsentState {
  if (!storage) {
    return 'unknown'
  }
  try {
    const raw = storage.getItem(KFZ_ANALYTICS_CONSENT_STORAGE_KEY)
    if (!raw) {
      return 'unknown'
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== KFZ_ANALYTICS_CONSENT_VERSION) {
      return 'unknown'
    }
    if (parsed.state === 'granted' || parsed.state === 'declined') {
      return parsed.state
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

const pendingFirstSource = new WeakMap<KfzAnalyticsConsentStorage, unknown>()

export function readPendingKfzAnalyticsFirstSource(
  storage: KfzAnalyticsConsentStorage | null | undefined,
): unknown {
  if (!storage) {
    return null
  }
  return pendingFirstSource.get(storage) ?? null
}

export function writePendingKfzAnalyticsFirstSource(
  storage: KfzAnalyticsConsentStorage | null | undefined,
  snapshot: unknown,
): void {
  if (!storage) {
    return
  }
  pendingFirstSource.set(storage, snapshot)
}

export function clearPendingKfzAnalyticsFirstSource(
  storage: KfzAnalyticsConsentStorage | null | undefined,
): void {
  if (!storage) {
    return
  }
  pendingFirstSource.delete(storage)
}

export function writeKfzAnalyticsConsent(
  storage: KfzAnalyticsConsentStorage | null | undefined,
  state: Exclude<KfzAnalyticsConsentState, 'unknown'>,
): void {
  if (!storage) {
    return
  }
  const snapshot: KfzAnalyticsConsentSnapshot = {
    state,
    version: KFZ_ANALYTICS_CONSENT_VERSION,
  }
  storage.setItem(KFZ_ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify(snapshot))
  if (state === 'declined') {
    storage.removeItem(KFZ_ANALYTICS_SESSION_STORAGE_KEY)
    storage.removeItem(KFZ_ANALYTICS_FIRST_SOURCE_STORAGE_KEY)
    pendingFirstSource.delete(storage)
  }
}

export function analyticsConsentAllowsPersist(
  state: KfzAnalyticsConsentState,
): boolean {
  return state === 'granted'
}

export function createKfzAnalyticsSessionId(
  randomUuid: () => string = () => crypto.randomUUID(),
): string {
  const value = randomUuid()
  if (!isKfzAnalyticsSessionId(value)) {
    throw new Error('analytics session id must be a UUID')
  }
  return value
}

export function readOrCreateKfzAnalyticsSessionId(
  storage: KfzAnalyticsConsentStorage | null | undefined,
  consent: KfzAnalyticsConsentState,
  randomUuid?: () => string,
): string | null {
  if (!analyticsConsentAllowsPersist(consent) || !storage) {
    return null
  }
  const existing = storage.getItem(KFZ_ANALYTICS_SESSION_STORAGE_KEY)
  if (existing && isKfzAnalyticsSessionId(existing)) {
    return existing
  }
  const created = createKfzAnalyticsSessionId(randomUuid)
  storage.setItem(KFZ_ANALYTICS_SESSION_STORAGE_KEY, created)
  return created
}

export function clearKfzAnalyticsSessionId(
  storage: KfzAnalyticsConsentStorage | null | undefined,
): void {
  storage?.removeItem(KFZ_ANALYTICS_SESSION_STORAGE_KEY)
}

export function withdrawKfzAnalyticsConsent(
  storage: KfzAnalyticsConsentStorage | null | undefined,
): void {
  writeKfzAnalyticsConsent(storage, 'declined')
}
