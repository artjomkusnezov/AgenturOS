import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  DASHBOARD_DAILY_QUOTES,
  getDailyQuote,
} from '@/features/dashboard/lib/dashboard-daily-quote'

describe('getDailyQuote', () => {
  it('returns a quote from the curated set', () => {
    const quote = getDailyQuote(new Date('2026-09-02T08:00:00+02:00'))
    assert.ok(DASHBOARD_DAILY_QUOTES.some((entry) => entry.text === quote.text))
    assert.equal(typeof quote.author, 'string')
    assert.ok(quote.author.length > 0)
  })

  it('returns the same quote for the same Berlin calendar day', () => {
    const morning = getDailyQuote(new Date('2026-09-02T07:00:00+02:00'))
    const evening = getDailyQuote(new Date('2026-09-02T22:30:00+02:00'))
    assert.deepEqual(morning, evening)
  })

  it('can change between different calendar days', () => {
    const dayA = getDailyQuote(new Date('2026-09-02T12:00:00+02:00'))
    const dayB = getDailyQuote(new Date('2026-09-03T12:00:00+02:00'))
    const allSame = DASHBOARD_DAILY_QUOTES.every((entry) => entry.text === dayA.text)
    if (!allSame) {
      assert.notEqual(dayA.text, dayB.text)
    }
  })
})
