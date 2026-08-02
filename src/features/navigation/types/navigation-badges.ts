export type NavigationBadgeTone = 'blue' | 'orange' | 'red' | 'neutral'

export type NavigationBadgeCounts = {
  inboxUnprocessed: number
  casesAttention: number
  casesAttentionOverdue: number
  caseViewCounts: Record<string, number>
}

export const EMPTY_NAVIGATION_BADGE_COUNTS: NavigationBadgeCounts = {
  inboxUnprocessed: 0,
  casesAttention: 0,
  casesAttentionOverdue: 0,
  caseViewCounts: {},
}
