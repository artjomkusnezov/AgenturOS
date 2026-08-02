import type { NavigationBadgeTone } from '@/features/navigation/types/navigation-badges'

type NavigationBadgeProps = {
  count: number
  tone: NavigationBadgeTone
  label: string
}

const toneClassNames: Record<NavigationBadgeTone, string> = {
  blue: 'bg-blue-100 text-blue-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  neutral: 'bg-zinc-100 text-zinc-600',
}

export function NavigationBadge({ count, tone, label }: NavigationBadgeProps) {
  if (count <= 0) {
    return null
  }

  return (
    <span
      aria-label={label}
      className={`ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums ${toneClassNames[tone]}`}
    >
      {count}
    </span>
  )
}
