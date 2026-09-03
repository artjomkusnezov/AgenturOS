import type { ReactNode } from 'react'

import type { TaskActivityKind } from '@/features/activity/types/task-activity'
import {
  DashboardIconActivity,
  DashboardIconAlert,
  DashboardIconBriefcase,
  DashboardIconCheckSquare,
  DashboardIconFile,
  DashboardIconFileText,
  DashboardIconImage,
  DashboardIconInbox,
  DashboardIconInfo,
  DashboardIconMail,
  DashboardIconMessage,
  DashboardIconMic,
  DashboardIconPenLine,
  DashboardIconFilePlus,
  DashboardIconPhone,
  DashboardIconTarget,
  DashboardIconUser,
  DashboardIconUsers,
  type DashboardAccent,
} from '@/features/dashboard/components/dashboard-icons'
import { getInboxSourceLabel } from '@/features/inbox/lib/inbox-source'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export type DashboardVisual = {
  label: string
  accent: DashboardAccent
  icon: ReactNode
}

const ICON_MD = 'h-[1.125rem] w-[1.125rem]'
const ICON_LG = 'h-5 w-5' /* ~20px inside 36–42px tiles */
const ICON_KPI = 'h-5 w-5'
const ICON_SM = 'h-3.5 w-3.5'

/**
 * Vorbereitete Quellschlüssel. Nur `manual_text` und `universal_capture`
 * werden aktuell aus dem Datenmodell angezeigt.
 */
export type PreparedInboxSourceKey =
  | InboxItem['source']
  | 'mail'
  | 'phone'
  | 'document'
  | 'image'
  | 'audio'

const PREPARED_INBOX_SOURCE_VISUALS: Record<PreparedInboxSourceKey, DashboardVisual> = {
  manual_text: {
    label: 'Manuell',
    accent: 'neutral',
    icon: <DashboardIconPenLine className={ICON_LG} />,
  },
  universal_capture: {
    label: 'Neu erfasst',
    accent: 'blue',
    icon: <DashboardIconFilePlus className={ICON_LG} />,
  },
  whatsapp: {
    label: 'WhatsApp',
    accent: 'green',
    icon: <DashboardIconMessage className={ICON_LG} />,
  },
  email: {
    label: 'E-Mail',
    accent: 'blue',
    icon: <DashboardIconMail className={ICON_LG} />,
  },
  mail: {
    label: 'E-Mail',
    accent: 'blue',
    icon: <DashboardIconMail className={ICON_LG} />,
  },
  phone: {
    label: 'Telefon',
    accent: 'green',
    icon: <DashboardIconPhone className={ICON_LG} />,
  },
  document: {
    label: 'Dokument',
    accent: 'orange',
    icon: <DashboardIconFileText className={ICON_LG} />,
  },
  image: {
    label: 'Bild',
    accent: 'violet',
    icon: <DashboardIconImage className={ICON_LG} />,
  },
  audio: {
    label: 'Sprachnachricht',
    accent: 'green',
    icon: <DashboardIconMic className={ICON_LG} />,
  },
}

export function resolveInboxSourceVisual(source: InboxItem['source']): DashboardVisual {
  const prepared = PREPARED_INBOX_SOURCE_VISUALS[source]
  if (prepared) {
    return {
      ...prepared,
      label: getInboxSourceLabel(source),
    }
  }

  return {
    label: 'Eingang',
    accent: 'neutral',
    icon: <DashboardIconInbox className={ICON_LG} />,
  }
}

export function resolveActivityKindVisual(kind: TaskActivityKind): DashboardVisual {
  switch (kind) {
    case 'task_file_linked':
      return {
        label: 'Datei',
        accent: 'neutral',
        icon: <DashboardIconFile className={ICON_MD} />,
      }
    case 'task_information_linked':
      return {
        label: 'Information',
        accent: 'violet',
        icon: <DashboardIconInfo className={ICON_MD} />,
      }
    case 'note':
      return {
        label: 'Kommentar',
        accent: 'blue',
        icon: <DashboardIconMessage className={ICON_MD} />,
      }
    case 'task_assignee_changed':
      return {
        label: 'Verantwortung',
        accent: 'green',
        icon: <DashboardIconUser className={ICON_MD} />,
      }
    case 'task_created':
    case 'task_completed':
    case 'task_reopened':
    default:
      return {
        label: 'Aufgabe',
        accent: 'green',
        icon: <DashboardIconCheckSquare className={ICON_MD} />,
      }
  }
}

export function resolveInformationVisual(isTeamInfo: boolean): DashboardVisual {
  if (isTeamInfo) {
    return {
      label: 'Teaminformation',
      accent: 'violet',
      icon: <DashboardIconUsers className={ICON_MD} />,
    }
  }

  return {
    label: 'Allgemeine Information',
    accent: 'blue',
    icon: <DashboardIconInfo className={ICON_MD} />,
  }
}

export type DashboardSectionKey =
  | 'inbox'
  | 'attention'
  | 'myWork'
  | 'tasks'
  | 'team'
  | 'goals'
  | 'information'
  | 'weeklyGoal'
  | 'activity'

export function resolveSectionVisual(section: DashboardSectionKey): DashboardVisual {
  switch (section) {
    case 'inbox':
      return {
        label: 'Neue Eingänge',
        accent: 'blue',
        icon: <DashboardIconInbox className={ICON_MD} />,
      }
    case 'attention':
      return {
        label: 'Braucht Aufmerksamkeit',
        accent: 'orange',
        icon: <DashboardIconAlert className={ICON_MD} />,
      }
    case 'myWork':
      return {
        label: 'Meine Arbeit',
        accent: 'green',
        icon: <DashboardIconBriefcase className={ICON_MD} />,
      }
    case 'tasks':
      return {
        label: 'Meine Aufgaben',
        accent: 'green',
        icon: <DashboardIconCheckSquare className={ICON_MD} />,
      }
    case 'team':
      return {
        label: 'Team',
        accent: 'violet',
        icon: <DashboardIconUsers className={ICON_MD} />,
      }
    case 'goals':
      return {
        label: 'Ziele',
        accent: 'green',
        icon: <DashboardIconTarget className={ICON_MD} />,
      }
    case 'information':
      return {
        label: 'Team & Informationen',
        accent: 'violet',
        icon: <DashboardIconUsers className={ICON_MD} />,
      }
    case 'weeklyGoal':
      return {
        label: 'Wochenaufgabe',
        accent: 'orange',
        icon: <DashboardIconTarget className={ICON_MD} />,
      }
    case 'activity':
      return {
        label: 'Aktivitäten',
        accent: 'blue',
        icon: <DashboardIconActivity className={ICON_MD} />,
      }
  }
}

export type DashboardOverviewKey = 'inbox' | 'tasks' | 'information' | 'weeklyGoal'

export function resolveOverviewVisual(key: DashboardOverviewKey): DashboardVisual {
  switch (key) {
    case 'inbox':
      return {
        label: 'Eingänge',
        accent: 'blue',
        icon: <DashboardIconInbox className={ICON_KPI} />,
      }
    case 'tasks':
      return {
        label: 'Aufgaben',
        accent: 'green',
        icon: <DashboardIconCheckSquare className={ICON_KPI} />,
      }
    case 'information':
      return {
        label: 'Informationen',
        accent: 'violet',
        icon: <DashboardIconInfo className={ICON_KPI} />,
      }
    case 'weeklyGoal':
      return {
        label: 'Wochenziel',
        accent: 'orange',
        icon: <DashboardIconTarget className={ICON_KPI} />,
      }
  }
}

export const dashboardMetaIconClassName = ICON_SM
