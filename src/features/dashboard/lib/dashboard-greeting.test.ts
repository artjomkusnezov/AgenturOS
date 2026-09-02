import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getFirstNameFromUser,
  getTimeOfDayGreeting,
  getWorkSituationHint,
} from '@/features/dashboard/lib/dashboard-greeting'

describe('getTimeOfDayGreeting', () => {
  it('returns Guten Morgen before noon Berlin time', () => {
    assert.equal(getTimeOfDayGreeting(new Date('2026-09-02T08:00:00+02:00')), 'Guten Morgen')
  })

  it('returns Guten Tag between noon and 18:00 Berlin time', () => {
    assert.equal(getTimeOfDayGreeting(new Date('2026-09-02T14:00:00+02:00')), 'Guten Tag')
  })

  it('returns Guten Abend after 18:00 Berlin time', () => {
    assert.equal(getTimeOfDayGreeting(new Date('2026-09-02T20:00:00+02:00')), 'Guten Abend')
  })
})

describe('getFirstNameFromUser', () => {
  it('returns trimmed first name from user metadata', () => {
    assert.equal(
      getFirstNameFromUser({ user_metadata: { first_name: '  Artjom  ' } }),
      'Artjom',
    )
  })

  it('returns null when first name is missing', () => {
    assert.equal(getFirstNameFromUser({ user_metadata: {} }), null)
  })
})

describe('getWorkSituationHint', () => {
  it('returns calm message when all counts are zero', () => {
    const hint = getWorkSituationHint({
      unprocessedInboxCount: 0,
      attentionCount: 0,
      myOpenTaskCount: 0,
      teamOpenTaskCount: 0,
    })
    assert.match(hint, /Alles ruhig/)
  })

  it('summarizes real operational counts', () => {
    const hint = getWorkSituationHint({
      unprocessedInboxCount: 2,
      attentionCount: 1,
      myOpenTaskCount: 3,
      teamOpenTaskCount: 0,
    })
    assert.match(hint, /2 neue Eingänge/)
    assert.match(hint, /1 Vorgang braucht Aufmerksamkeit/)
    assert.match(hint, /3 eigene offene Aufgaben/)
  })
})
