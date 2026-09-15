import { DashboardAccentTile } from '@/features/dashboard/components/dashboard-icons'
import { resolveInboxItemSourceVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

type DashboardInboxSourceIconProps = {
  item: Pick<InboxItem, 'source' | 'channel' | 'inbound_metadata'>
}

export function DashboardInboxSourceIcon({ item }: DashboardInboxSourceIconProps) {
  const visual = resolveInboxItemSourceVisual(item)

  return (
    <DashboardAccentTile label={visual.label} accent={visual.accent} size="md">
      {visual.icon}
    </DashboardAccentTile>
  )
}
