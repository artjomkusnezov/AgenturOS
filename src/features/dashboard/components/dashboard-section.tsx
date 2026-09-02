import Link from 'next/link'
import type { ReactNode } from 'react'

import type { DashboardAccent } from '@/features/dashboard/components/dashboard-icons'
import { resolveSurfaceClasses } from '@/features/dashboard/lib/agenturzentrale-surface'
import type { DashboardVariant } from '@/features/dashboard/lib/dashboard-variant'
import {
  aosIconAccentBlueClassName,
  aosIconAccentGreenClassName,
  aosIconAccentOrangeClassName,
  aosIconAccentVioletClassName,
} from '@/lib/design-system'

const accentTextClass: Record<DashboardAccent, string> = {
  blue: aosIconAccentBlueClassName,
  green: aosIconAccentGreenClassName,
  violet: aosIconAccentVioletClassName,
  orange: aosIconAccentOrangeClassName,
  neutral: 'text-zinc-400',
}

const azAccentTextClass: Record<DashboardAccent, string> = {
  blue: 'text-[var(--az-accent-blue)]',
  green: 'text-[var(--az-accent-emerald)]',
  violet: 'text-violet-400',
  orange: 'text-[var(--az-accent-amber)]',
  neutral: 'text-[var(--az-text-muted)]',
}

type DashboardSectionProps = {
  title: string
  titleId: string
  children: ReactNode
  href?: string
  hrefLabel?: string
  className?: string
  headerExtra?: ReactNode
  icon?: ReactNode
  iconAccent?: DashboardAccent
  variant?: DashboardVariant
}

export function DashboardSection({
  title,
  titleId,
  children,
  href,
  hrefLabel,
  className = '',
  headerExtra,
  icon,
  iconAccent = 'neutral',
  variant = 'default',
}: DashboardSectionProps) {
  const surfaces = resolveSurfaceClasses(variant)
  const accentClass =
    variant === 'agenturzentrale' ? azAccentTextClass[iconAccent] : accentTextClass[iconAccent]

  return (
    <section aria-labelledby={titleId} className={`flex flex-col ${className}`}>
      <div
        className={`${surfaces.sectionPadding} flex items-center justify-between gap-2 pt-3`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span className={`shrink-0 ${accentClass}`} aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <h2 id={titleId} className={surfaces.sectionHeader}>
            {title}
          </h2>
        </div>
        {headerExtra}
      </div>

      <div className="pt-1">{children}</div>

      {href && hrefLabel ? (
        <div className={`${surfaces.sectionPadding} pb-3 pt-1`}>
          <Link href={href} className={surfaces.link}>
            {hrefLabel}
          </Link>
        </div>
      ) : null}
    </section>
  )
}

type DashboardSectionEmptyProps = {
  message: string
  variant?: DashboardVariant
}

export function DashboardSectionEmpty({
  message,
  variant = 'default',
}: DashboardSectionEmptyProps) {
  const surfaces = resolveSurfaceClasses(variant)

  return <p className={surfaces.empty}>{message}</p>
}
