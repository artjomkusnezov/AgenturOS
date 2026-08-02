import type { ReactNode, SVGProps } from 'react'

import {
  aosIconTileBlueClassName,
  aosIconTileClassName,
  aosIconTileGreenClassName,
  aosIconTileKpiClassName,
  aosIconTileMdClassName,
  aosIconTileNeutralClassName,
  aosIconTileOrangeClassName,
  aosIconTileSmClassName,
  aosIconTileVioletClassName,
} from '@/lib/design-system'

export type DashboardAccent = 'blue' | 'green' | 'violet' | 'orange' | 'neutral'

type IconProps = SVGProps<SVGSVGElement>

const strokeProps = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
}

function baseClass(className?: string) {
  return className ?? 'h-[1.125rem] w-[1.125rem]'
}

export function DashboardIconInbox(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M4 8h16l-1.5 10.5a1.5 1.5 0 0 1-1.5 1.3H7a1.5 1.5 0 0 1-1.5-1.3L4 8Z" />
      <path d="M8 8V6.5A4 4 0 0 1 16 6.5V8" />
      <path d="M9 13h6" />
    </svg>
  )
}

export function DashboardIconCheckSquare(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function DashboardIconListChecks(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M10 7h10M10 12h10M10 17h10" />
      <path d="m3.5 7 1.2 1.2L6.5 6.4M3.5 12l1.2 1.2L6.5 11.4M3.5 17l1.2 1.2L6.5 16.4" />
    </svg>
  )
}

export function DashboardIconInfo(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 10.5v5M12 8h.01" />
    </svg>
  )
}

export function DashboardIconTarget(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <circle cx="12" cy="12" r="8.25" />
      <circle cx="12" cy="12" r="4.75" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function DashboardIconActivity(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M4 12h3.5l2-5 3.5 10 2.5-5H20" />
    </svg>
  )
}

export function DashboardIconFileText(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M8 4h6l4 4v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M14 4v4h4M9 13h6M9 17h4" />
    </svg>
  )
}

export function DashboardIconPlusCircle(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  )
}

export function DashboardIconMail(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="m4 8 8 5 8-5" />
    </svg>
  )
}

export function DashboardIconPhone(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M8.5 4.5h7A1.5 1.5 0 0 1 17 6v12a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 18V6a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M10 17.5h4" />
    </svg>
  )
}

export function DashboardIconImage(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <circle cx="9" cy="10.5" r="1.25" />
      <path d="m8 16 3-3 2.5 2.5L16 13l4 3" />
    </svg>
  )
}

export function DashboardIconMic(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <rect x="9" y="5" width="6" height="10" rx="3" />
      <path d="M7 11a5 5 0 0 0 10 0M12 16v3" />
    </svg>
  )
}

export function DashboardIconCalendar(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 4v4M16 4v4M4 11h16" />
    </svg>
  )
}

export function DashboardIconFlag(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M6 4v16M6 5h9l-1.5 3.5L15 12H6" />
    </svg>
  )
}

export function DashboardIconAlert(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M12 4.5 20.5 19H3.5L12 4.5Z" />
      <path d="M12 10v4M12 16.5h.01" />
    </svg>
  )
}

export function DashboardIconBriefcase(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <rect x="3.5" y="8" width="17" height="11" rx="2" />
      <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8M3.5 13h17" />
    </svg>
  )
}

export function DashboardIconUser(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <circle cx="12" cy="9" r="3.25" />
      <path d="M6.5 18.5a5.5 5.5 0 0 1 11 0" />
    </svg>
  )
}

export function DashboardIconUsers(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <circle cx="9" cy="9" r="2.75" />
      <circle cx="16" cy="10" r="2.25" />
      <path d="M4.5 18a4.5 4.5 0 0 1 9 0M13 18a3.5 3.5 0 0 1 6.5-1.5" />
    </svg>
  )
}

export function DashboardIconMessage(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M6 7.5A2.5 2.5 0 0 1 8.5 5h7A2.5 2.5 0 0 1 18 7.5v5A2.5 2.5 0 0 1 15.5 15H10l-3.5 3v-3H8.5A2.5 2.5 0 0 1 6 12.5v-5Z" />
    </svg>
  )
}

export function DashboardIconFile(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M8 4h6l4 4v12H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M14 4v4h4" />
    </svg>
  )
}

export function DashboardIconCheck(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg className={baseClass(className)} viewBox="0 0 24 24" {...strokeProps} strokeWidth={2} {...rest}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  )
}

const accentTileClass: Record<DashboardAccent, string> = {
  blue: aosIconTileBlueClassName,
  green: aosIconTileGreenClassName,
  violet: aosIconTileVioletClassName,
  orange: aosIconTileOrangeClassName,
  neutral: aosIconTileNeutralClassName,
}

type DashboardAccentTileProps = {
  label: string
  accent: DashboardAccent
  size?: 'sm' | 'md' | 'kpi'
  children: ReactNode
}

export function DashboardAccentTile({
  label,
  accent,
  size = 'md',
  children,
}: DashboardAccentTileProps) {
  const sizeClass =
    size === 'kpi'
      ? aosIconTileKpiClassName
      : size === 'sm'
        ? aosIconTileSmClassName
        : aosIconTileMdClassName

  return (
    <span
      className={`${aosIconTileClassName} ${sizeClass} ${accentTileClass[accent]}`}
      title={label}
      aria-hidden="true"
    >
      {children}
    </span>
  )
}
