/**
 * Test-only Kfz release-candidate acceptance contract.
 * Not a production approval. Reports never include secret or customer values.
 */

export const KFZ_RC_FAILURE_CLASSES = [
  'configuration_missing',
  'persistence_unavailable',
  'unauthorized_review',
  'route_missing',
] as const

export type KfzRcFailureClass = (typeof KFZ_RC_FAILURE_CLASSES)[number]

export const KFZ_RC_REQUIRED_ROUTES = [
  { id: 'landing', href: '/kfz', file: 'src/app/kfz/page.tsx' },
  { id: 'intake_api', href: '/api/inbound/kfz', file: 'src/app/api/inbound/kfz/route.ts' },
  { id: 'inbox', href: '/app/inbox', file: 'src/app/app/inbox/page.tsx' },
  {
    id: 'document_review',
    href: '/app/inbox/kfz-document',
    file: 'src/app/app/inbox/kfz-document/route.ts',
  },
  {
    id: 'analytics_api',
    href: '/api/inbound/kfz-analytics',
    file: 'src/app/api/inbound/kfz-analytics/route.ts',
  },
] as const

export type KfzRcRequiredRouteId = (typeof KFZ_RC_REQUIRED_ROUTES)[number]['id']

export type KfzRcRoutePresence = {
  id: KfzRcRequiredRouteId
  href: string
  present: boolean
}

export type KfzRcFailure = {
  class: KfzRcFailureClass
  code:
    | 'config_missing'
    | 'store_unavailable'
    | 'review_unauthenticated'
    | 'review_forbidden'
    | 'route_missing'
}

export type KfzRcStepId =
  | 'routes'
  | 'six_branches'
  | 'questionnaire'
  | 'consent'
  | 'submit_retry'
  | 'exact_once'
  | 'inbox'
  | 'authorized_review'
  | 'anonymous_rejection'
  | 'cross_item_rejection'
  | 'analytics_metadata_only'
  | 'public_supabase_keys'

export type KfzRcStepResult = {
  id: KfzRcStepId
  ok: boolean
  failure: KfzRcFailure | null
}

export type KfzRcPublicSupabaseKeyModes = {
  current: boolean
  legacy: boolean
  missing: boolean
}

export type KfzRcAcceptanceReport = {
  ok: boolean
  scope: 'test_only_local_harness'
  productionClaim: false
  inboxItemCount: number
  documentObjectCount: number
  exactOnce: boolean
  authorizedReviewStatus: 200 | 0
  anonymousReviewStatus: 401 | 0
  crossItemReviewStatus: 404 | 0
  analyticsEventNames: readonly string[]
  publicSupabaseKeyModes: KfzRcPublicSupabaseKeyModes
  routes: readonly KfzRcRoutePresence[]
  steps: readonly KfzRcStepResult[]
}
