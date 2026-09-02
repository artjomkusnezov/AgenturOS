import type { NavigationBadgeTone } from '@/features/navigation/types/navigation-badges'

type NavigationBadgeProps = {
  count: number
  tone: NavigationBadgeTone
  label: string
  variant?: 'default' | 'agenturzentrale'
}

const toneClassNames: Record<NavigationBadgeTone, string> = {
  blue: 'bg-blue-100 text-blue-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  neutral: 'bg-zinc-100 text-zinc-600',
}

const azToneClassNames: Record<NavigationBadgeTone, string> = {
  blue: 'az-nav-badge-blue',
  orange: 'az-nav-badge-orange',
  red: 'az-nav-badge-red',
  neutral: 'az-nav-badge-neutral',
}

export function NavigationBadge({
  count,
  tone,
  label,
  variant = 'default',
}: NavigationBadgeProps) {
  if (count <= 0) {
    return null
  }

  const toneClass =
    variant === 'agenturzentrale' ? azToneClassNames[tone] : toneClassNames[tone]

  return (
    <span
      aria-label={label}
      className={`ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums ${toneClass}`}
    >
      {count}
    </span>
  )
}
