/**
 * One test-only Kfz release-candidate acceptance path:
 * /kfz → submit → exact-once retry → one inbox item → authorized review →
 * anonymous/cross-item rejection. Failures stay classified without values.
 */
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import {
  classifyKfzReleaseCandidateFailure,
  createKfzReleaseCandidateFixtureBytes,
  createKfzReleaseCandidateSyntheticFixture,
  inspectKfzReleaseCandidateRoutes,
  kfzReleaseCandidateForbiddenValues,
  kfzReleaseCandidateReportLeaks,
  KFZ_RC_SYNTHETIC_EMAIL,
  KFZ_RC_SYNTHETIC_FILENAME,
  KFZ_RC_SYNTHETIC_FULL_NAME,
  KFZ_RC_SYNTHETIC_PHONE,
  probeKfzReleaseCandidateFailure,
  runKfzReleaseCandidateAcceptance,
} from '@/features/inbound/kfz/lib/kfz-release-candidate-acceptance'
import { resetRateLimitBucketsForTests } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { KFZ_LAUNCH_REQUIRED_BRANCH_IDS } from '@/features/inbound/kfz/lib/kfz-launch-readiness'
import { KFZ_LANDING_BRANCHES } from '@/features/inbound/kfz/lib/kfz-questionnaire'
import {
  KFZ_RC_FAILURE_CLASSES,
  KFZ_RC_REQUIRED_ROUTES,
} from '@/features/inbound/kfz/types/kfz-release-candidate-acceptance'

describe('kfz release-candidate acceptance harness', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('walks /kfz submit, exact-once retry, inbox and authorized review', async () => {
    const fixture = createKfzReleaseCandidateSyntheticFixture()
    assert.equal(fixture.document.filename, KFZ_RC_SYNTHETIC_FILENAME)
    assert.equal(fixture.document.bytes.byteLength, createKfzReleaseCandidateFixtureBytes().byteLength)
    assert.deepEqual(
      KFZ_LANDING_BRANCHES.map((branch) => branch.id),
      [...KFZ_LAUNCH_REQUIRED_BRANCH_IDS],
    )

    const report = await runKfzReleaseCandidateAcceptance()
    assert.equal(report.scope, 'test_only_local_harness')
    assert.equal(report.productionClaim, false)
    assert.equal(report.ok, true)
    assert.equal(report.inboxItemCount, 1)
    assert.equal(report.documentObjectCount, 1)
    assert.equal(report.exactOnce, true)
    assert.equal(report.authorizedReviewStatus, 200)
    assert.equal(report.anonymousReviewStatus, 401)
    assert.equal(report.crossItemReviewStatus, 404)
    assert.equal(report.publicSupabaseKeyModes.current, true)
    assert.equal(report.publicSupabaseKeyModes.legacy, true)
    assert.equal(report.publicSupabaseKeyModes.missing, true)
    assert.deepEqual(
      report.routes.map((route) => route.href),
      KFZ_RC_REQUIRED_ROUTES.map((route) => route.href),
    )
    assert.equal(report.routes.every((route) => route.present), true)
    assert.equal(report.steps.every((entry) => entry.ok), true)
    assert.ok(report.analyticsEventNames.includes('landing_view'))
    assert.ok(report.analyticsEventNames.includes('traffic_source'))
    assert.ok(report.analyticsEventNames.includes('initial_branch_selected'))
    assert.ok(report.analyticsEventNames.includes('step_view'))
    assert.ok(report.analyticsEventNames.includes('funnel_abandoned'))
    assert.ok(report.analyticsEventNames.includes('submit_succeeded'))
    assert.equal(kfzReleaseCandidateReportLeaks(report).length, 0)
    assert.equal(JSON.stringify(report).includes(KFZ_RC_SYNTHETIC_FULL_NAME), false)
    assert.equal(JSON.stringify(report).includes(KFZ_RC_SYNTHETIC_PHONE), false)
    assert.equal(JSON.stringify(report).includes(KFZ_RC_SYNTHETIC_EMAIL), false)
    assert.equal(JSON.stringify(report).includes(KFZ_RC_SYNTHETIC_FILENAME), false)
    assert.doesNotMatch(JSON.stringify(report), /kfz\/11111111/)
    assert.doesNotMatch(JSON.stringify(report), /Meta Pixel|whatsapp\.com\/api|graph\.facebook/)
  })

  it('distinguishes the four failure classes without printing values', async () => {
    const configuration = await probeKfzReleaseCandidateFailure('configuration_missing')
    const persistence = await probeKfzReleaseCandidateFailure('persistence_unavailable')
    const unauthorized = await probeKfzReleaseCandidateFailure('unauthorized_review')
    const route = await probeKfzReleaseCandidateFailure('route_missing')

    assert.deepEqual(
      [configuration.class, persistence.class, unauthorized.class, route.class],
      [...KFZ_RC_FAILURE_CLASSES],
    )
    assert.equal(configuration.code, 'config_missing')
    assert.equal(persistence.code, 'store_unavailable')
    assert.equal(unauthorized.code, 'review_unauthenticated')
    assert.equal(route.code, 'route_missing')

    const classified = [
      classifyKfzReleaseCandidateFailure({ kind: 'intake', code: 'config_missing', status: 503 }),
      classifyKfzReleaseCandidateFailure({ kind: 'persist', code: 'store_unavailable', status: 503 }),
      classifyKfzReleaseCandidateFailure({ kind: 'review', status: 401 }),
      classifyKfzReleaseCandidateFailure({ kind: 'review', status: 404 }),
      classifyKfzReleaseCandidateFailure({ kind: 'route', routePresent: false }),
    ]
    assert.deepEqual(
      classified.map((entry) => entry?.class),
      [
        'configuration_missing',
        'persistence_unavailable',
        'unauthorized_review',
        'unauthorized_review',
        'route_missing',
      ],
    )

    const blob = JSON.stringify({ configuration, persistence, unauthorized, route, classified })
    for (const probe of kfzReleaseCandidateForbiddenValues()) {
      assert.equal(blob.includes(probe), false, probe)
    }
    assert.doesNotMatch(blob, /eyJ|service-role-do-not-print|rc-accept-intake/)
  })

  it('treats a missing checked-in route as route_missing', () => {
    const routes = inspectKfzReleaseCandidateRoutes(undefined, [
      { path: 'src/app/kfz/page.tsx', present: false },
      { path: 'src/app/api/inbound/kfz/route.ts', present: true },
      { path: 'src/app/app/inbox/page.tsx', present: true },
      { path: 'src/app/app/inbox/kfz-document/route.ts', present: true },
      { path: 'src/app/api/inbound/kfz-analytics/route.ts', present: true },
    ])
    const landing = routes.find((route) => route.id === 'landing')
    assert.equal(landing?.present, false)
    const failure = classifyKfzReleaseCandidateFailure({
      kind: 'route',
      routePresent: landing?.present,
    })
    assert.equal(failure?.class, 'route_missing')
    assert.equal(JSON.stringify(failure).includes(KFZ_RC_SYNTHETIC_FILENAME), false)
  })
})
