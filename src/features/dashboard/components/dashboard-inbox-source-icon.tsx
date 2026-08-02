import { DashboardAccentTile } from '@/features/dashboard/components/dashboard-icons'
import { resolveInboxSourceVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

type DashboardInboxSourceIconProps = {
  source: InboxItem['source']
}

export function DashboardInboxSourceIcon({ source }: DashboardInboxSourceIconProps) {
  const visual = resolveInboxSourceVisual(source)

  return (
    <DashboardAccentTile label={visual.label} accent={visual.accent} size="md">
      {visual.icon}
    </DashboardAccentTile>
  )
}
