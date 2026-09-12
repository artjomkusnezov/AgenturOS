import type { KfzAnalyticsRecord } from '@/features/inbound/kfz/types/kfz-analytics'

const T0 = '2026-09-09T08:00:00.000Z'
const T1 = '2026-09-09T08:02:00.000Z'
const T2 = '2026-09-09T08:06:00.000Z'
const T3 = '2026-09-09T08:12:00.000Z'
const T4 = '2026-09-09T08:18:00.000Z'

export const KFZ_ANALYTICS_FIXTURE_SESSION_A =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
export const KFZ_ANALYTICS_FIXTURE_SESSION_B =
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
export const KFZ_ANALYTICS_FIXTURE_SESSION_C =
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
export const KFZ_ANALYTICS_FIXTURE_SESSION_D =
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

function event(
  sessionId: string,
  eventName: KfzAnalyticsRecord['eventName'],
  occurredAt: string,
  properties: KfzAnalyticsRecord['properties'] = {},
  suffix = '',
): KfzAnalyticsRecord {
  const stepPart =
    eventName === 'step_view' || eventName === 'step_completed'
      ? `:${properties.stepId ?? 'unknown'}`
      : eventName === 'back_navigation'
        ? `:${properties.fromStepId ?? 'unknown'}:${properties.stepId ?? 'unknown'}`
        : eventName === 'validation_blocked'
          ? `:${properties.stepId ?? 'unknown'}:${properties.fieldId ?? 'unknown'}`
          : eventName === 'submit_failed'
            ? `:${properties.errorCategory ?? 'unknown'}`
            : ''
  return {
    eventName,
    eventKey: `${sessionId}:${eventName}${stepPart}${suffix}`,
    sessionId,
    occurredAt,
    properties,
  }
}

/** Complete upload-documents funnel from a Google campaign. */
export const KFZ_ANALYTICS_FIXTURE_COMPLETED: KfzAnalyticsRecord[] = [
  event(KFZ_ANALYTICS_FIXTURE_SESSION_A, 'landing_view', T0, { activeMs: 40_000 }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_A, 'traffic_source', T0, {
    trafficSource: 'utm',
    referrerCategory: 'search',
    utmSource: 'google',
    utmCampaign: 'kfz-check',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_A, 'step_view', T0, {
    stepId: 'branch',
    activeMs: 8_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_A, 'funnel_start', T1, {
    branchId: 'upload_documents',
    activeMs: 12_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_A, 'initial_branch_selected', T1, {
    branchId: 'upload_documents',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_A, 'step_completed', T1, {
    stepId: 'branch',
    activeMs: 8_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_A, 'step_view', T1, {
    stepId: 'contact',
    fromStepId: 'branch',
    activeMs: 20_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_A, 'step_completed', T2, {
    stepId: 'contact',
    activeMs: 20_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_A, 'step_view', T2, {
    stepId: 'documents',
    fromStepId: 'contact',
    activeMs: 15_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_A, 'submit_started', T3, { activeMs: 55_000 }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_A, 'submit_succeeded', T3, { activeMs: 56_000 }),
]

/** Abandoned in the middle of the questionnaire (usage step). */
export const KFZ_ANALYTICS_FIXTURE_ABANDONED_MID: KfzAnalyticsRecord[] = [
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'landing_view', T0, { activeMs: 25_000 }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'traffic_source', T0, {
    trafficSource: 'direct',
    referrerCategory: 'direct',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'step_view', T0, {
    stepId: 'branch',
    activeMs: 5_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'funnel_start', T1, {
    branchId: 'switch_car',
    activeMs: 9_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'initial_branch_selected', T1, {
    branchId: 'switch_car',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'step_completed', T1, {
    stepId: 'branch',
    activeMs: 5_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'step_view', T1, {
    stepId: 'registration',
    fromStepId: 'branch',
    activeMs: 12_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'step_completed', T2, {
    stepId: 'registration',
    activeMs: 12_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'step_view', T2, {
    stepId: 'vehicle',
    fromStepId: 'registration',
    activeMs: 18_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'back_navigation', T2, {
    fromStepId: 'vehicle',
    stepId: 'registration',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'step_view', T4, {
    stepId: 'usage',
    fromStepId: 'registration',
    activeMs: 7_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'funnel_abandoned', T4, {
    lastStepId: 'usage',
    activeMs: 62_000,
  }),
]

/** Direct visit that never starts the funnel. */
export const KFZ_ANALYTICS_FIXTURE_BOUNCE: KfzAnalyticsRecord[] = [
  event(KFZ_ANALYTICS_FIXTURE_SESSION_C, 'landing_view', T0, { activeMs: 4_000 }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_C, 'traffic_source', T0, {
    trafficSource: 'direct',
    referrerCategory: 'direct',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_C, 'step_view', T0, {
    stepId: 'branch',
    activeMs: 4_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_C, 'funnel_abandoned', T4, {
    lastStepId: 'branch',
    activeMs: 4_000,
  }),
]

/** Validation and submit failure, then success (exact-once). */
export const KFZ_ANALYTICS_FIXTURE_RETRY_SUCCESS: KfzAnalyticsRecord[] = [
  event(KFZ_ANALYTICS_FIXTURE_SESSION_D, 'landing_view', T0, { activeMs: 30_000 }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_D, 'traffic_source', T0, {
    trafficSource: 'utm',
    referrerCategory: 'social',
    utmSource: 'instagram',
    utmCampaign: 'wechsel',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_D, 'funnel_start', T1, {
    branchId: 'evb',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_D, 'initial_branch_selected', T1, {
    branchId: 'evb',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_D, 'step_view', T1, { stepId: 'branch' }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_D, 'step_view', T2, {
    stepId: 'contact',
    fromStepId: 'branch',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_D, 'validation_blocked', T2, {
    stepId: 'contact',
    fieldId: 'whatsapp_requires_phone',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_D, 'submit_started', T3),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_D, 'submit_failed', T3, {
    errorCategory: 'timeout',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_D, 'submit_succeeded', T4, { activeMs: 48_000 }),
]

export const KFZ_ANALYTICS_FIXTURE_SESSION_E =
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
export const KFZ_ANALYTICS_FIXTURE_SESSION_F =
  'ffffffff-ffff-4fff-8fff-ffffffffffff'

const T_OTHER = '2026-08-01T10:00:00.000Z'

/** Visit and funnel start with no traffic source, branch or last step — unknown, not invented. */
export const KFZ_ANALYTICS_FIXTURE_UNKNOWN: KfzAnalyticsRecord[] = [
  event(KFZ_ANALYTICS_FIXTURE_SESSION_E, 'landing_view', T0, { activeMs: 6_000 }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_E, 'funnel_start', T1, { activeMs: 6_000 }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_E, 'funnel_abandoned', T4, { activeMs: 6_000 }),
]

/** Same anonymous shape on a different calendar day, for date-range isolation. */
export const KFZ_ANALYTICS_FIXTURE_OTHER_DAY: KfzAnalyticsRecord[] = [
  event(KFZ_ANALYTICS_FIXTURE_SESSION_F, 'landing_view', T_OTHER, { activeMs: 9_000 }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_F, 'traffic_source', T_OTHER, {
    trafficSource: 'campaign',
    referrerCategory: 'other',
    utmCampaign: 'evb',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_F, 'funnel_start', T_OTHER, {
    branchId: 'evb',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_F, 'initial_branch_selected', T_OTHER, {
    branchId: 'evb',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_F, 'step_view', T_OTHER, { stepId: 'branch' }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_F, 'submit_succeeded', T_OTHER, {
    activeMs: 9_000,
  }),
]

export const KFZ_ANALYTICS_FIXTURE_SESSION_G =
  'abababab-abab-4aba-8aba-abababababab'
export const KFZ_ANALYTICS_FIXTURE_SESSION_H =
  '12121212-1212-4121-8121-121212121212'
export const KFZ_ANALYTICS_FIXTURE_SESSION_I =
  '13131313-1313-4131-8131-131313131313'
export const KFZ_ANALYTICS_FIXTURE_SESSION_J =
  '14141414-1414-4141-8141-141414141414'

const T_RECENT = '2026-09-09T11:50:00.000Z'

/**
 * Dirty metadata-only fixture: impossible jump, extreme/negative time,
 * duplicate step_view, incomplete session. No answers or personal data.
 */
export const KFZ_ANALYTICS_FIXTURE_QUALITY_DIRTY: KfzAnalyticsRecord[] = [
  event(KFZ_ANALYTICS_FIXTURE_SESSION_G, 'landing_view', T_RECENT, {
    activeMs: 99_999_999_999,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_G, 'traffic_source', T_RECENT, {
    trafficSource: 'utm',
    referrerCategory: 'search',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_G, 'step_view', T_RECENT, {
    stepId: 'documents',
    activeMs: -40,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_G, 'step_view', T_RECENT, {
    stepId: 'branch',
    fromStepId: 'documents',
    activeMs: 8_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_G, 'step_view', '2026-09-09T11:51:00.000Z', {
    stepId: 'branch',
    fromStepId: 'documents',
    activeMs: 8_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_H, 'traffic_source', T_RECENT, {}),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_H, 'step_view', T_RECENT, {
    stepId: 'usage',
    fromStepId: 'branch',
    activeMs: 3_000,
  }),
]

export const KFZ_ANALYTICS_FIXTURE_ALL: KfzAnalyticsRecord[] = [
  ...KFZ_ANALYTICS_FIXTURE_COMPLETED,
  ...KFZ_ANALYTICS_FIXTURE_ABANDONED_MID,
  ...KFZ_ANALYTICS_FIXTURE_BOUNCE,
  ...KFZ_ANALYTICS_FIXTURE_RETRY_SUCCESS,
]

const T_PREVIOUS = '2026-09-01T10:00:00.000Z'

export const KFZ_ANALYTICS_FIXTURE_SESSION_PREVIOUS =
  '01010101-0101-4101-8101-010101010101'

/** Same anonymous shape in the previous 7-day window for period comparison. */
export const KFZ_ANALYTICS_FIXTURE_PREVIOUS_WINDOW: KfzAnalyticsRecord[] = [
  event(KFZ_ANALYTICS_FIXTURE_SESSION_PREVIOUS, 'landing_view', T_PREVIOUS, {
    activeMs: 11_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_PREVIOUS, 'traffic_source', T_PREVIOUS, {
    trafficSource: 'direct',
    referrerCategory: 'direct',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_PREVIOUS, 'funnel_start', T_PREVIOUS, {
    branchId: 'first_car',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_PREVIOUS, 'initial_branch_selected', T_PREVIOUS, {
    branchId: 'first_car',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_PREVIOUS, 'step_view', T_PREVIOUS, {
    stepId: 'branch',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_PREVIOUS, 'submit_succeeded', T_PREVIOUS, {
    activeMs: 11_000,
  }),
]

function numberedSessionId(index: number): string {
  return `aa000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`
}

export function cloneKfzAnalyticsSession(
  events: readonly KfzAnalyticsRecord[],
  sessionId: string,
  occurredAtShiftMs = 0,
): KfzAnalyticsRecord[] {
  return events.map((entry) => {
    const occurredAt = new Date(Date.parse(entry.occurredAt) + occurredAtShiftMs).toISOString()
    return {
      ...entry,
      sessionId,
      occurredAt,
      eventKey: entry.eventKey.replace(entry.sessionId, sessionId),
      properties: { ...entry.properties },
    }
  })
}

/**
 * Five-plus sessions per coarse source and selected branch so aggregate
 * conversion math is visible without exposing a single session.
 */
export function buildKfzAnalyticsComparisonFixture(): KfzAnalyticsRecord[] {
  const events: KfzAnalyticsRecord[] = []
  for (let index = 0; index < 5; index += 1) {
    events.push(
      ...cloneKfzAnalyticsSession(
        KFZ_ANALYTICS_FIXTURE_COMPLETED,
        numberedSessionId(index + 1),
        index * 60_000,
      ),
    )
    events.push(
      ...cloneKfzAnalyticsSession(
        KFZ_ANALYTICS_FIXTURE_ABANDONED_MID,
        numberedSessionId(index + 11),
        index * 60_000,
      ),
    )
  }
  events.push(
    ...cloneKfzAnalyticsSession(
      KFZ_ANALYTICS_FIXTURE_RETRY_SUCCESS,
      numberedSessionId(21),
    ),
  )
  events.push(
    ...cloneKfzAnalyticsSession(KFZ_ANALYTICS_FIXTURE_BOUNCE, numberedSessionId(22)),
  )
  return events
}

export const KFZ_ANALYTICS_FIXTURE_COMPARISON = buildKfzAnalyticsComparisonFixture()

/** Organic search entry that completes first-car. No UTM tokens. */
export const KFZ_ANALYTICS_FIXTURE_ORGANIC: KfzAnalyticsRecord[] = [
  event(KFZ_ANALYTICS_FIXTURE_SESSION_I, 'landing_view', T0, { activeMs: 14_000 }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_I, 'traffic_source', T0, {
    trafficSource: 'direct',
    referrerCategory: 'search',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_I, 'funnel_start', T1, {
    branchId: 'first_car',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_I, 'initial_branch_selected', T1, {
    branchId: 'first_car',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_I, 'step_view', T1, { stepId: 'branch' }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_I, 'submit_succeeded', T3, { activeMs: 14_000 }),
]

/** Referral/social entry that completes additional-car. No UTM tokens. */
export const KFZ_ANALYTICS_FIXTURE_REFERRAL: KfzAnalyticsRecord[] = [
  event(KFZ_ANALYTICS_FIXTURE_SESSION_J, 'landing_view', T0, { activeMs: 16_000 }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_J, 'traffic_source', T0, {
    trafficSource: 'direct',
    referrerCategory: 'other',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_J, 'funnel_start', T1, {
    branchId: 'additional_car',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_J, 'initial_branch_selected', T1, {
    branchId: 'additional_car',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_J, 'step_view', T1, { stepId: 'branch' }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_J, 'submit_succeeded', T3, { activeMs: 16_000 }),
]

/**
 * Five-plus sessions for each coarse source × selected branch so authorized
 * review can show rates without exposing a single session.
 */
export function buildKfzAnalyticsSourceBranchFixture(): KfzAnalyticsRecord[] {
  const events: KfzAnalyticsRecord[] = []
  for (let index = 0; index < 5; index += 1) {
    events.push(
      ...cloneKfzAnalyticsSession(
        KFZ_ANALYTICS_FIXTURE_COMPLETED,
        numberedSessionId(index + 31),
        index * 60_000,
      ),
    )
    events.push(
      ...cloneKfzAnalyticsSession(
        KFZ_ANALYTICS_FIXTURE_ORGANIC,
        numberedSessionId(index + 41),
        index * 60_000,
      ),
    )
    events.push(
      ...cloneKfzAnalyticsSession(
        KFZ_ANALYTICS_FIXTURE_REFERRAL,
        numberedSessionId(index + 51),
        index * 60_000,
      ),
    )
    events.push(
      ...cloneKfzAnalyticsSession(
        KFZ_ANALYTICS_FIXTURE_ABANDONED_MID,
        numberedSessionId(index + 61),
        index * 60_000,
      ),
    )
  }
  return events
}

export const KFZ_ANALYTICS_FIXTURE_SOURCE_BRANCH =
  buildKfzAnalyticsSourceBranchFixture()

function shiftFromFixtureT0(iso: string): number {
  return Date.parse(iso) - Date.parse(T0)
}

/**
 * Anonymous sessions spread across 7/30/90-day windows so the authorized
 * decision view can compare coarse source × selected branch without inventing
 * dates or personal data.
 */
export function buildKfzAnalyticsDecisionPeriodFixture(): KfzAnalyticsRecord[] {
  const windows: ReadonlyArray<{
    template: readonly KfzAnalyticsRecord[]
    at: string
    start: number
    count: number
  }> = [
    {
      template: KFZ_ANALYTICS_FIXTURE_COMPLETED,
      at: '2026-09-09T08:00:00.000Z',
      start: 71,
      count: 5,
    },
    {
      template: KFZ_ANALYTICS_FIXTURE_ORGANIC,
      at: '2026-08-20T10:00:00.000Z',
      start: 81,
      count: 5,
    },
    {
      template: KFZ_ANALYTICS_FIXTURE_REFERRAL,
      at: '2026-07-01T10:00:00.000Z',
      start: 91,
      count: 5,
    },
    {
      template: KFZ_ANALYTICS_FIXTURE_ABANDONED_MID,
      at: '2026-05-01T10:00:00.000Z',
      start: 101,
      count: 5,
    },
  ]
  const events: KfzAnalyticsRecord[] = []
  for (const window of windows) {
    const shift = shiftFromFixtureT0(window.at)
    for (let index = 0; index < window.count; index += 1) {
      events.push(
        ...cloneKfzAnalyticsSession(
          window.template,
          numberedSessionId(window.start + index),
          shift + index * 60_000,
        ),
      )
    }
  }
  events.push(
    ...cloneKfzAnalyticsSession(
      KFZ_ANALYTICS_FIXTURE_RETRY_SUCCESS,
      numberedSessionId(111),
      shiftFromFixtureT0('2026-09-09T09:00:00.000Z'),
    ),
  )
  events.push(
    ...cloneKfzAnalyticsSession(
      KFZ_ANALYTICS_FIXTURE_UNKNOWN,
      numberedSessionId(112),
      shiftFromFixtureT0('2026-09-09T09:30:00.000Z'),
    ),
  )
  return events
}

export const KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS =
  buildKfzAnalyticsDecisionPeriodFixture()
