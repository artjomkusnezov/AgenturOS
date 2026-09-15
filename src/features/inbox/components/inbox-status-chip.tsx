import type { KfzWorkQueueChipKind } from '@/features/inbox/lib/kfz-work-queue'

export type InboxStatusChipSurface = 'inbox' | 'cockpit' | 'zentrale'

const INBOX_CHIP_CLASS: Record<KfzWorkQueueChipKind, string> = {
  new: 'aos-inbox-chip-new',
  gaps: 'aos-inbox-chip-gaps',
  review: 'aos-inbox-chip-review',
  handled: 'aos-inbox-chip-handled',
}

const COCKPIT_CHIP_CLASS: Record<KfzWorkQueueChipKind, string> = {
  new: 'aos-cockpit-status-chip aos-cockpit-status-chip--new',
  gaps: 'aos-cockpit-status-chip aos-cockpit-status-chip--gaps',
  review: 'aos-cockpit-status-chip aos-cockpit-status-chip--review',
  handled: 'aos-cockpit-status-chip aos-cockpit-status-chip--handled',
}

const ZENTRALE_CHIP_CLASS: Record<KfzWorkQueueChipKind, string> = {
  new: 'az-chip az-chip--new',
  gaps: 'az-chip az-chip--gaps',
  review: 'az-chip az-chip--review',
  handled: 'az-chip az-chip--handled',
}

function chipClassName(kind: KfzWorkQueueChipKind, surface: InboxStatusChipSurface): string {
  if (surface === 'cockpit') {
    return COCKPIT_CHIP_CLASS[kind]
  }
  if (surface === 'zentrale') {
    return ZENTRALE_CHIP_CLASS[kind]
  }
  return INBOX_CHIP_CLASS[kind]
}

export function InboxStatusChip({
  label,
  kind,
  surface = 'inbox',
}: {
  label: string
  kind: KfzWorkQueueChipKind
  surface?: InboxStatusChipSurface
}) {
  return <span className={chipClassName(kind, surface)}>{label}</span>
}
