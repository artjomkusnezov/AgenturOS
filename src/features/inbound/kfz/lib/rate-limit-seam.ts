/**
 * In-memory Rate-Limit-Seam (Gate 2).
 *
 * Production-Follow-up: durch shared store (z. B. Upstash / Vercel KV /
 * Edge-Middleware) ersetzen — gleiche Schnittstelle `consumeRateLimit`.
 *
 * Keine Kunden-Payloads; Key ist nur ein undurchsichtiger Bucket (IP-Hash / route).
 */

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export type RateLimitDecision = {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

export function consumeRateLimit(input: {
  key: string
  max: number
  windowMs: number
  nowMs?: number
}): RateLimitDecision {
  const now = input.nowMs ?? Date.now()
  const existing = buckets.get(input.key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs })
    return {
      allowed: true,
      remaining: Math.max(0, input.max - 1),
      retryAfterMs: 0,
    }
  }

  if (existing.count >= input.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: Math.max(0, input.max - existing.count),
    retryAfterMs: 0,
  }
}

/** Nur für Tests. */
export function resetRateLimitBucketsForTests(): void {
  buckets.clear()
}
