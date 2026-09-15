import { isKfzAnalyticsReferrerCategory } from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import type { KfzAnalyticsReferrerCategory } from '@/features/inbound/kfz/types/kfz-analytics'

export { isKfzAnalyticsReferrerCategory }

/**
 * Coarse referrer class only. The raw referrer, hostname, path and query
 * are never returned and must never be persisted.
 */
const SEARCH_HOSTS = [
  'google.com',
  'google.de',
  'bing.com',
  'duckduckgo.com',
  'yahoo.com',
  'ecosia.org',
] as const

const SOCIAL_HOSTS = [
  'instagram.com',
  'facebook.com',
  'fb.com',
  'whatsapp.com',
  't.co',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
] as const

const INTERNAL_HOSTS = ['artkus.de', 'localhost'] as const

function hostMatches(host: string, suffixes: readonly string[]): boolean {
  return suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
}

function hostnameFromReferrer(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > 2048) {
    return null
  }
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    const parsed = new URL(withProtocol)
    const host = parsed.hostname.toLowerCase()
    if (!host || host.includes('@') || host.includes(' ')) {
      return null
    }
    return host
  } catch {
    return null
  }
}

export function kfzAnalyticsReferrerCategoryLabel(id: string): string {
  if (id === 'direct') {
    return 'Direkt'
  }
  if (id === 'search') {
    return 'Suche'
  }
  if (id === 'social') {
    return 'Social'
  }
  if (id === 'internal') {
    return 'Intern'
  }
  if (id === 'other') {
    return 'Andere'
  }
  return 'Unbekannt'
}

/**
 * Maps a raw document.referrer (or test stand-in) to an allow-listed
 * category. Returns only the category — never the input string, host or URL.
 */
export function classifyKfzAnalyticsReferrerCategory(
  referrer: string | null | undefined,
): KfzAnalyticsReferrerCategory | undefined {
  if (referrer == null) {
    return 'direct'
  }
  if (typeof referrer !== 'string') {
    return undefined
  }
  const trimmed = referrer.trim()
  if (!trimmed) {
    return 'direct'
  }

  const host = hostnameFromReferrer(trimmed)
  if (!host) {
    return undefined
  }
  if (hostMatches(host, SEARCH_HOSTS)) {
    return 'search'
  }
  if (hostMatches(host, SOCIAL_HOSTS)) {
    return 'social'
  }
  if (hostMatches(host, INTERNAL_HOSTS)) {
    return 'internal'
  }
  return 'other'
}

export function sanitizeKfzAnalyticsReferrerCategory(
  value: unknown,
): KfzAnalyticsReferrerCategory | undefined {
  if (isKfzAnalyticsReferrerCategory(value)) {
    return value
  }
  if (typeof value === 'string') {
    return classifyKfzAnalyticsReferrerCategory(value)
  }
  return undefined
}
