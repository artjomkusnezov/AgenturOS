export type CaptureMode =
  | 'inbox'
  | 'task'
  | 'offer'
  | 'claim'
  | 'follow_up'
  | 'information'
  | 'file'

export type CapturePhase = 'closed' | 'menu' | CaptureMode

/** Reserved for future quick actions – not implemented in Punkt 25. */
export type FutureCaptureMode =
  | 'photo'
  | 'camera'
  | 'voice'
  | 'email'
  | 'whatsapp'
  | 'scan'

export type QuickActionIcon =
  | 'inbox'
  | 'tasks'
  | 'offer'
  | 'claim'
  | 'follow_up'
  | 'information'
  | 'files'

export type QuickActionDefinition = {
  mode: CaptureMode
  label: string
  description: string
  icon: QuickActionIcon
}

export type QuickActionGroup = {
  actions: QuickActionDefinition[]
}

export const QUICK_ACTION_GROUPS: QuickActionGroup[] = [
  {
    actions: [
      {
        mode: 'inbox',
        label: 'Neuer Eingang',
        description: 'Schnellnotiz oder Datei zum Sortieren',
        icon: 'inbox',
      },
    ],
  },
  {
    actions: [
      {
        mode: 'task',
        label: 'Neue Aufgabe',
        description: 'Aufgabe mit optionalen Dateien erfassen',
        icon: 'tasks',
      },
      {
        mode: 'offer',
        label: 'Neues Angebot',
        description: 'Angebot direkt als Vorgang anlegen',
        icon: 'offer',
      },
      {
        mode: 'claim',
        label: 'Neuer Schaden',
        description: 'Schaden direkt als Vorgang anlegen',
        icon: 'claim',
      },
      {
        mode: 'follow_up',
        label: 'Neue Wiedervorlage',
        description: 'Mit Pflichtdatum planen',
        icon: 'follow_up',
      },
      {
        mode: 'information',
        label: 'Neue Information',
        description: 'Wissen mit optionalen Anhängen festhalten',
        icon: 'information',
      },
    ],
  },
  {
    actions: [
      {
        mode: 'file',
        label: 'Datei hochladen',
        description: 'Als Information mit Anhang erfassen',
        icon: 'files',
      },
    ],
  },
]

/** Flache Liste für einfache Iteration. */
export const QUICK_ACTIONS: QuickActionDefinition[] = QUICK_ACTION_GROUPS.flatMap(
  (group) => group.actions,
)

export function isDirectCaseCaptureMode(
  mode: CaptureMode,
): mode is 'offer' | 'claim' | 'follow_up' {
  return mode === 'offer' || mode === 'claim' || mode === 'follow_up'
}
