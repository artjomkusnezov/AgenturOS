import Link from 'next/link'
import type { ReactNode } from 'react'

import type { DashboardAccent } from '@/features/dashboard/components/dashboard-icons'
import {
  dashboardSectionHeaderClassName,
  dashboardSectionPaddingClassName,
} from '@/features/dashboard/lib/dashboard-surface'
import {
  aosIconAccentBlueClassName,
  aosIconAccentGreenClassName,
  aosIconAccentOrangeClassName,
  aosIconAccentVioletClassName,
  aosLinkClassName,
} from '@/lib/design-system'

const accentTextClass: Record<DashboardAccent, string> = {
  blue: aosIconAccentBlueClassName,
  green: aosIconAccentGreenClassName,
  violet: aosIconAccentVioletClassName,
  orange: aosIconAccentOrangeClassName,
  neutral: 'text-zinc-400',
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
}: DashboardSectionProps) {
  return (
    <section aria-labelledby={titleId} className={`flex flex-col ${className}`}>
      <div
        className={`${dashboardSectionPaddingClassName} flex items-center justify-between gap-2 pt-3`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span className={`shrink-0 ${accentTextClass[iconAccent]}`} aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <h2 id={titleId} className={dashboardSectionHeaderClassName}>
            {title}
          </h2>
        </div>
        {headerExtra}
      </div>

      <div className="pt-1">{children}</div>

      {href && hrefLabel ? (
        <div className={`${dashboardSectionPaddingClassName} pb-3 pt-1`}>
          <Link
            href={href}
            className={`text-sm transition-opacity duration-150 hover:opacity-80 ${aosLinkClassName}`}
          >
            {hrefLabel}
          </Link>
        </div>
      ) : null}
    </section>
  )
}

type DashboardSectionEmptyProps = {
  message: string
}

export function DashboardSectionEmpty({ message }: DashboardSectionEmptyProps) {
  return <p className="py-1.5 text-xs leading-relaxed text-zinc-500">{message}</p>
}
