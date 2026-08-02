import type { NavigationBadgeCounts, NavigationBadgeTone } from '@/features/navigation/types/navigation-badges'

export type NavigationBadgeDisplay = {
  count: number
  tone: NavigationBadgeTone
  label: string
}

export function getMainNavBadge(
  href: string,
  counts: NavigationBadgeCounts,
): NavigationBadgeDisplay | null {
  if (href === '/app/inbox' && counts.inboxUnprocessed > 0) {
    return {
      count: counts.inboxUnprocessed,
      tone: 'blue',
      label: `${counts.inboxUnprocessed} unbearbeitet`,
    }
  }

  if (href === '/app/cases' && counts.casesAttention > 0) {
    return {
      count: counts.casesAttention,
      tone: counts.casesAttentionOverdue > 0 ? 'red' : 'neutral',
      label: `${counts.casesAttention} brauchen Aufmerksamkeit`,
    }
  }

  return null
}

export function getCaseViewNavBadge(
  viewKey: string,
  viewName: string,
  counts: NavigationBadgeCounts,
): NavigationBadgeDisplay | null {
  const count = counts.caseViewCounts[viewKey] ?? 0

  if (count <= 0) {
    return null
  }

  if (viewKey === 'tasks') {
    return {
      count,
      tone: 'orange',
      label: `${count} eigene offene Aufgaben`,
    }
  }

  return {
    count,
    tone: 'neutral',
    label: `${count} offene ${viewName}`,
  }
}
