import type { ReactNode, SVGProps } from 'react'
import {
  Activity,
  AlertTriangle,
  Briefcase,
  Calendar,
  Check,
  CirclePlus,
  File,
  FilePlus,
  FileText,
  Flag,
  Image as ImageIcon,
  Inbox,
  Info,
  ListTodo,
  Mail,
  MessageCircle,
  Mic,
  PenLine,
  Phone,
  Settings,
  SquareCheck,
  Target,
  User,
  Users,
} from 'lucide-react'

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

/** Consistent Lucide stroke for Agenturzentrale / dashboard chrome. */
export const DASHBOARD_ICON_STROKE = 1.75

function baseClass(className?: string) {
  return className ?? 'h-5 w-5'
}

function lucideProps(className: string | undefined, rest: IconProps) {
  return {
    className: baseClass(className),
    strokeWidth: DASHBOARD_ICON_STROKE,
    'aria-hidden': true as const,
    ...rest,
  }
}

export function DashboardIconInbox(props: IconProps) {
  const { className, ...rest } = props
  return <Inbox {...lucideProps(className, rest)} />
}

export function DashboardIconCheckSquare(props: IconProps) {
  const { className, ...rest } = props
  return <SquareCheck {...lucideProps(className, rest)} />
}

export function DashboardIconListChecks(props: IconProps) {
  const { className, ...rest } = props
  return <ListTodo {...lucideProps(className, rest)} />
}

export function DashboardIconInfo(props: IconProps) {
  const { className, ...rest } = props
  return <Info {...lucideProps(className, rest)} />
}

export function DashboardIconTarget(props: IconProps) {
  const { className, ...rest } = props
  return <Target {...lucideProps(className, rest)} />
}

export function DashboardIconActivity(props: IconProps) {
  const { className, ...rest } = props
  return <Activity {...lucideProps(className, rest)} />
}

export function DashboardIconFileText(props: IconProps) {
  const { className, ...rest } = props
  return <FileText {...lucideProps(className, rest)} />
}

export function DashboardIconPlusCircle(props: IconProps) {
  const { className, ...rest } = props
  return <CirclePlus {...lucideProps(className, rest)} />
}

export function DashboardIconPenLine(props: IconProps) {
  const { className, ...rest } = props
  return <PenLine {...lucideProps(className, rest)} />
}

export function DashboardIconFilePlus(props: IconProps) {
  const { className, ...rest } = props
  return <FilePlus {...lucideProps(className, rest)} />
}

export function DashboardIconMail(props: IconProps) {
  const { className, ...rest } = props
  return <Mail {...lucideProps(className, rest)} />
}

export function DashboardIconPhone(props: IconProps) {
  const { className, ...rest } = props
  return <Phone {...lucideProps(className, rest)} />
}

export function DashboardIconImage(props: IconProps) {
  const { className, ...rest } = props
  return <ImageIcon {...lucideProps(className, rest)} />
}

export function DashboardIconMic(props: IconProps) {
  const { className, ...rest } = props
  return <Mic {...lucideProps(className, rest)} />
}

export function DashboardIconCalendar(props: IconProps) {
  const { className, ...rest } = props
  return <Calendar {...lucideProps(className, rest)} />
}

export function DashboardIconFlag(props: IconProps) {
  const { className, ...rest } = props
  return <Flag {...lucideProps(className, rest)} />
}

export function DashboardIconAlert(props: IconProps) {
  const { className, ...rest } = props
  return <AlertTriangle {...lucideProps(className, rest)} />
}

export function DashboardIconBriefcase(props: IconProps) {
  const { className, ...rest } = props
  return <Briefcase {...lucideProps(className, rest)} />
}

export function DashboardIconUser(props: IconProps) {
  const { className, ...rest } = props
  return <User {...lucideProps(className, rest)} />
}

export function DashboardIconUsers(props: IconProps) {
  const { className, ...rest } = props
  return <Users {...lucideProps(className, rest)} />
}

export function DashboardIconMessage(props: IconProps) {
  const { className, ...rest } = props
  return <MessageCircle {...lucideProps(className, rest)} />
}

export function DashboardIconFile(props: IconProps) {
  const { className, ...rest } = props
  return <File {...lucideProps(className, rest)} />
}

export function DashboardIconCheck(props: IconProps) {
  const { className, ...rest } = props
  return <Check {...lucideProps(className, rest)} strokeWidth={2} />
}

export function DashboardIconSettings(props: IconProps) {
  const { className, ...rest } = props
  return <Settings {...lucideProps(className, rest)} />
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
