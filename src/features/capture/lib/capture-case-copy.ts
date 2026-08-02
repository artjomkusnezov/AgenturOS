import type { DirectCaseTypeKey } from '@/features/cases/lib/validate-create-case'

export const CAPTURE_CASE_DIALOG_COPY: Record<
  DirectCaseTypeKey,
  { title: string; description: string; submitLabel: string }
> = {
  offer: {
    title: 'Neues Angebot',
    description: 'Angebot mit Titel, Verantwortlichem und optionaler Fälligkeit erfassen.',
    submitLabel: 'Angebot erstellen',
  },
  claim: {
    title: 'Neuer Schaden',
    description: 'Schaden mit Titel, Verantwortlichem und optionaler Fälligkeit erfassen.',
    submitLabel: 'Schaden erstellen',
  },
  follow_up: {
    title: 'Neue Wiedervorlage',
    description: 'Wiedervorlage mit Pflichtdatum und Verantwortlichem erfassen.',
    submitLabel: 'Wiedervorlage erstellen',
  },
}
