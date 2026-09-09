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
    activeMs: 20_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_A, 'step_completed', T2, {
    stepId: 'contact',
    activeMs: 20_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_A, 'step_view', T2, {
    stepId: 'documents',
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
    activeMs: 12_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'step_completed', T2, {
    stepId: 'registration',
    activeMs: 12_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'step_view', T2, {
    stepId: 'vehicle',
    activeMs: 18_000,
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'back_navigation', T2, {
    fromStepId: 'vehicle',
    stepId: 'registration',
  }),
  event(KFZ_ANALYTICS_FIXTURE_SESSION_B, 'step_view', T4, {
    stepId: 'usage',
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
  event(KFZ_ANALYTICS_FIXTURE_SESSION_D, 'step_view', T2, { stepId: 'contact' }),
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

export const KFZ_ANALYTICS_FIXTURE_ALL: KfzAnalyticsRecord[] = [
  ...KFZ_ANALYTICS_FIXTURE_COMPLETED,
  ...KFZ_ANALYTICS_FIXTURE_ABANDONED_MID,
  ...KFZ_ANALYTICS_FIXTURE_BOUNCE,
  ...KFZ_ANALYTICS_FIXTURE_RETRY_SUCCESS,
]
