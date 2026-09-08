/**
 * Manual Kfz inbox triage using existing status / note / task boundaries only.
 * Intake and presentation never call this with a write — only explicit human actions.
 */

import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import {
  applyKfzResponseDraft,
  composeInboxWorkingCopy,
  hasKfzResponseDraft,
  splitInboxWorkingCopy,
} from '@/features/inbox/lib/kfz-response-draft'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export { KFZ_INTERNAL_NOTE_HEADING } from '@/features/inbox/lib/kfz-response-draft'

export const KFZ_REVIEW_NO_AUTO_ACTION =
  'Nichts wird automatisch gesendet oder angelegt.'

export const KFZ_REVIEW_STARTED_NOTE =
  'Prüfung begonnen. Interne Sichtung — kein automatischer Kundenkontakt.'

export const KFZ_INTERNAL_NOTE_MAX_LENGTH = 2000

export type KfzManualTriageActionId =
  | 'start_review'
  | 'record_internal_note'
  | 'save_response_draft'
  | 'create_follow_up_task'
  | 'mark_handled'

export type KfzTriagePhase = 'needs_review' | 'in_review' | 'handled'

export type KfzManualTriageAction = {
  id: KfzManualTriageActionId
  label: string
  description: string
  available: boolean
  boundary: 'note' | 'task' | 'status'
  requiresExplicitHumanAction: true
}

export type KfzTriageWorkingCopy = {
  content: string
  processed_at: string | null
  linkedTaskId: string | null
}

export type KfzManualTriageCommand =
  | { type: 'start_review' }
  | { type: 'record_internal_note'; note: string }
  | { type: 'save_response_draft'; draft: string }
  | { type: 'create_follow_up_task'; taskId: string }
  | { type: 'mark_handled'; at: string }

export type KfzManualTriageApplyResult =
  | {
      ok: true
      next: KfzTriageWorkingCopy
      mutated: { content: boolean; processed: boolean; task: boolean }
    }
  | { ok: false; error: string }

export function hasInternalInboxNote(content: string): boolean {
  return splitInboxWorkingCopy(content).notes.length > 0
}

export function hasKfzReviewStartedNote(content: string): boolean {
  return content.includes(KFZ_REVIEW_STARTED_NOTE)
}

/** Removes operator-only notes and drafts so AI / source facts stay on the inquiry text. */
export function stripInternalInboxNotes(content: string): string {
  return splitInboxWorkingCopy(content).source
}

export function appendInternalInboxNote(
  content: string,
  note: string,
): { ok: true; content: string } | { ok: false; error: string } {
  const trimmed = note.trim()
  if (!trimmed) {
    return { ok: false, error: 'Bitte geben Sie eine interne Notiz ein.' }
  }
  if (trimmed.length > KFZ_INTERNAL_NOTE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Die Notiz darf höchstens ${KFZ_INTERNAL_NOTE_MAX_LENGTH} Zeichen lang sein.`,
    }
  }

  const parts = splitInboxWorkingCopy(content)
  const notes = parts.notes ? `${parts.notes}\n${trimmed}` : trimmed

  return {
    ok: true,
    content: composeInboxWorkingCopy({ ...parts, notes }),
  }
}

export function resolveKfzTriagePhase(
  item: Pick<InboxItem, 'processed_at' | 'content'>,
  linkedTaskId: string | null = null,
): KfzTriagePhase {
  if (!isInboxItemUnprocessed(item)) {
    return 'handled'
  }
  if (
    linkedTaskId ||
    hasInternalInboxNote(item.content) ||
    hasKfzReviewStartedNote(item.content) ||
    hasKfzResponseDraft(item.content)
  ) {
    return 'in_review'
  }
  return 'needs_review'
}

export function buildKfzNextManualAction(
  item: Pick<InboxItem, 'processed_at' | 'content'>,
  linkedTaskId: string | null = null,
  missingCount = 0,
): string {
  const suffix = KFZ_REVIEW_NO_AUTO_ACTION
  const phase = resolveKfzTriagePhase(item, linkedTaskId)

  if (phase === 'handled') {
    return `Bereits manuell als bearbeitet markiert. ${suffix}`
  }

  const missingLead =
    missingCount > 0
      ? missingCount === 1
        ? '1 fehlende Angabe intern prüfen. '
        : `${missingCount} fehlende Angaben intern prüfen. `
      : ''

  if (phase === 'in_review') {
    if (linkedTaskId) {
      return `${missingLead}Interne Folgeaufgabe ist angelegt. Prüfung fortsetzen oder manuell als erledigt markieren. ${suffix}`
    }
    if (hasKfzResponseDraft(item.content)) {
      return `${missingLead}Interner Antwortentwurf ist gespeichert. Prüfung fortsetzen, Notiz ergänzen oder manuell als erledigt markieren. ${suffix}`
    }
    return `${missingLead}Prüfung läuft intern. Notiz ergänzen, interne Folgeaufgabe anlegen oder manuell als erledigt markieren. ${suffix}`
  }
  return `${missingLead}Prüfung starten — interne Notiz erfassen oder interne Folgeaufgabe anlegen. ${suffix}`
}

export function listKfzManualTriageActions(
  item: Pick<InboxItem, 'processed_at' | 'content'>,
  linkedTaskId: string | null = null,
): KfzManualTriageAction[] {
  const unprocessed = isInboxItemUnprocessed(item)
  const reviewStarted = hasKfzReviewStartedNote(item.content)

  return [
    {
      id: 'start_review',
      label: 'Prüfung starten',
      description: 'Interne Sichtung beginnen. Es wird keine Nachricht gesendet.',
      available: unprocessed && !reviewStarted,
      boundary: 'note',
      requiresExplicitHumanAction: true,
    },
    {
      id: 'record_internal_note',
      label: 'Interne Notiz',
      description: 'Nur intern am Eingang vermerken — nicht an den Kunden.',
      available: true,
      boundary: 'note',
      requiresExplicitHumanAction: true,
    },
    {
      id: 'save_response_draft',
      label: 'Interner Antwortentwurf',
      description: 'Antwort intern vorbereiten. Es wird keine Nachricht gesendet.',
      available: true,
      boundary: 'note',
      requiresExplicitHumanAction: true,
    },
    {
      id: 'create_follow_up_task',
      label: 'Interne Folgeaufgabe',
      description: 'Als bestehende Aufgabe übernehmen. Kein Kundenkontakt.',
      available: !linkedTaskId,
      boundary: 'task',
      requiresExplicitHumanAction: true,
    },
    {
      id: 'mark_handled',
      label: 'Als erledigt markieren',
      description: 'Nur durch diese explizite Aktion. Nichts wird gesendet.',
      available: unprocessed,
      boundary: 'status',
      requiresExplicitHumanAction: true,
    },
  ]
}

/**
 * Pure state transition for explicit manual actions.
 * Calling this with no command — or never calling it — leaves the working copy unchanged.
 */
export function applyKfzManualTriageCommand(
  current: KfzTriageWorkingCopy,
  command: KfzManualTriageCommand | null,
): KfzManualTriageApplyResult {
  if (!command) {
    return {
      ok: true,
      next: { ...current },
      mutated: { content: false, processed: false, task: false },
    }
  }

  if (command.type === 'start_review') {
    if (hasKfzReviewStartedNote(current.content)) {
      return {
        ok: true,
        next: { ...current },
        mutated: { content: false, processed: false, task: false },
      }
    }
    const appended = appendInternalInboxNote(current.content, KFZ_REVIEW_STARTED_NOTE)
    if (!appended.ok) {
      return appended
    }
    return {
      ok: true,
      next: { ...current, content: appended.content },
      mutated: { content: true, processed: false, task: false },
    }
  }

  if (command.type === 'record_internal_note') {
    const appended = appendInternalInboxNote(current.content, command.note)
    if (!appended.ok) {
      return appended
    }
    return {
      ok: true,
      next: { ...current, content: appended.content },
      mutated: { content: true, processed: false, task: false },
    }
  }

  if (command.type === 'save_response_draft') {
    const applied = applyKfzResponseDraft(current.content, command.draft)
    if (!applied.ok) {
      return applied
    }
    return {
      ok: true,
      next: { ...current, content: applied.content },
      mutated: { content: applied.mutated, processed: false, task: false },
    }
  }

  if (command.type === 'create_follow_up_task') {
    const taskId = command.taskId.trim()
    if (!taskId) {
      return { ok: false, error: 'Die Aufgaben-ID ist ungültig.' }
    }
    if (current.linkedTaskId) {
      return { ok: false, error: 'Es ist bereits eine interne Folgeaufgabe verknüpft.' }
    }
    return {
      ok: true,
      next: { ...current, linkedTaskId: taskId },
      mutated: { content: false, processed: false, task: true },
    }
  }

  if (current.processed_at) {
    return { ok: false, error: 'Das Eingangselement ist bereits bearbeitet.' }
  }
  if (!command.at.trim()) {
    return { ok: false, error: 'Der Bearbeitungszeitpunkt fehlt.' }
  }

  return {
    ok: true,
    next: { ...current, processed_at: command.at },
    mutated: { content: false, processed: true, task: false },
  }
}
