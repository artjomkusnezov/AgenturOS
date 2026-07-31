import type {
  ActivityDateGroupKey,
  ActivityListGroup,
  TaskActivityItem,
} from '@/features/activity/types/task-activity'

const BERLIN_TIME_ZONE = 'Europe/Berlin'

function formatBerlinDateKey(value: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BERLIN_TIME_ZONE,
  }).format(typeof value === 'string' ? new Date(value) : value)
}

function formatReadableDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))

  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: BERLIN_TIME_ZONE,
  }).format(date)
}

export function getActivityDateGroupKey(
  occurredAt: string,
  now = new Date(),
): ActivityDateGroupKey {
  const entryDateKey = formatBerlinDateKey(occurredAt)
  const todayKey = formatBerlinDateKey(now)

  if (entryDateKey === todayKey) {
    return 'today'
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = formatBerlinDateKey(yesterday)

  if (entryDateKey === yesterdayKey) {
    return 'yesterday'
  }

  return entryDateKey
}

export function getActivityGroupLabel(key: ActivityDateGroupKey): string {
  if (key === 'today') {
    return 'Heute'
  }

  if (key === 'yesterday') {
    return 'Gestern'
  }

  return formatReadableDateLabel(key)
}

export function formatActivityTimestamp(occurredAt: string, groupKey: ActivityDateGroupKey): string {
  const timeLabel = new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BERLIN_TIME_ZONE,
  }).format(new Date(occurredAt))

  if (groupKey === 'today') {
    return `Heute, ${timeLabel} Uhr`
  }

  if (groupKey === 'yesterday') {
    return `Gestern, ${timeLabel} Uhr`
  }

  const dateLabel = formatReadableDateLabel(groupKey)

  return `${dateLabel}, ${timeLabel} Uhr`
}

export function groupTaskActivityItems(items: TaskActivityItem[]): ActivityListGroup[] {
  const groups = new Map<ActivityDateGroupKey, TaskActivityItem[]>()

  for (const item of items) {
    const key = getActivityDateGroupKey(item.occurredAt)
    const existing = groups.get(key)

    if (existing) {
      existing.push(item)
    } else {
      groups.set(key, [item])
    }
  }

  return Array.from(groups.entries()).map(([key, groupItems]) => ({
    key,
    label: getActivityGroupLabel(key),
    items: groupItems,
  }))
}
