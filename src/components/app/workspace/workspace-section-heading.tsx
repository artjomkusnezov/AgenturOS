import type { ReactNode } from 'react'

import type { DashboardAccent } from '@/features/dashboard/components/dashboard-icons'
import {
  aosIconAccentBlueClassName,
  aosIconAccentGreenClassName,
  aosIconAccentOrangeClassName,
  aosIconAccentVioletClassName,
  aosWorkspaceSectionTitleClassName,
  aosWsTextMetaClassName,
} from '@/lib/design-system'

const accentClass: Record<DashboardAccent, string> = {
  blue: aosIconAccentBlueClassName,
  green: aosIconAccentGreenClassName,
  violet: aosIconAccentVioletClassName,
  orange: aosIconAccentOrangeClassName,
  neutral: aosWsTextMetaClassName,
}

type WorkspaceSectionHeadingProps = {
  title: string
  icon: ReactNode
  accent?: DashboardAccent
  trailing?: ReactNode
  count?: number
}

export function WorkspaceSectionHeading({
  title,
  icon,
  accent = 'neutral',
  trailing,
  count,
}: WorkspaceSectionHeadingProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`shrink-0 ${accentClass[accent]}`} aria-hidden="true">
          {icon}
        </span>
        <h3 className={aosWorkspaceSectionTitleClassName}>
          {title}
          {typeof count === 'number' && count > 0 ? (
            <span className={`ml-1.5 text-[11px] font-normal ${aosWsTextMetaClassName}`}>{count}</span>
          ) : null}
        </h3>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  )
}
