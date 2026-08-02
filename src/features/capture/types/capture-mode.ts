export type CaptureMode = 'task' | 'information' | 'inbox' | 'file'

export type CapturePhase = 'closed' | 'menu' | CaptureMode

/** Reserved for future quick actions – not implemented in Punkt 25. */
export type FutureCaptureMode =
  | 'photo'
  | 'camera'
  | 'voice'
  | 'email'
  | 'whatsapp'
  | 'scan'

export type QuickActionDefinition = {
  mode: CaptureMode
  label: string
  description: string
  icon: 'tasks' | 'information' | 'inbox' | 'files'
}

export const QUICK_ACTIONS: QuickActionDefinition[] = [
  {
    mode: 'task',
    label: 'Neue Aufgabe',
    description: 'Vorgang mit optionalen Dateien erfassen',
    icon: 'tasks',
  },
  {
    mode: 'information',
    label: 'Neue Information',
    description: 'Wissen mit optionalen Anhängen festhalten',
    icon: 'information',
  },
  {
    mode: 'inbox',
    label: 'Neuer Eingang',
    description: 'Schnellnotiz oder Datei zum Sortieren',
    icon: 'inbox',
  },
  {
    mode: 'file',
    label: 'Datei hochladen',
    description: 'Als Information mit Anhang erfassen',
    icon: 'files',
  },
]
