/**
 * Internal Kfz response draft on the existing inbox working copy.
 * Source text, draft and operator notes stay separable. Nothing is sent.
 */

export const KFZ_RESPONSE_DRAFT_HEADING =
  '--- Interner Antwortentwurf (nicht gesendet) ---'

export const KFZ_INTERNAL_NOTE_HEADING =
  '--- Interne Notiz (nicht an Kunden gesendet) ---'

export const KFZ_RESPONSE_DRAFT_MAX_LENGTH = 4000

export const KFZ_RESPONSE_DRAFT_NO_SEND =
  'Nichts wird automatisch gesendet oder nach außen übertragen.'

export const KFZ_AI_DRAFT_REVIEW_LABEL =
  'KI-Text ist ein Vorschlag — menschliche Prüfung erforderlich'

export type InboxWorkingCopyParts = {
  source: string
  draft: string
  notes: string
}

export type KfzResponseDraftApplyResult =
  | { ok: true; content: string; mutated: boolean }
  | { ok: false; error: string }

function indexOfHeading(content: string, heading: string): number {
  if (content.startsWith(heading)) {
    return 0
  }

  const marked = `\n${heading}`
  const index = content.indexOf(marked)
  return index >= 0 ? index + 1 : -1
}

function bodyBetween(content: string, start: number, heading: string, end: number): string {
  return content.slice(start + heading.length, end).replace(/^\n/, '').trimEnd()
}

/** Splits source inquiry text, optional internal draft and operator notes. */
export function splitInboxWorkingCopy(content: string): InboxWorkingCopyParts {
  const draftAt = indexOfHeading(content, KFZ_RESPONSE_DRAFT_HEADING)
  const notesAt = indexOfHeading(content, KFZ_INTERNAL_NOTE_HEADING)
  const markers = [
    draftAt >= 0
      ? { kind: 'draft' as const, at: draftAt, heading: KFZ_RESPONSE_DRAFT_HEADING }
      : null,
    notesAt >= 0
      ? { kind: 'notes' as const, at: notesAt, heading: KFZ_INTERNAL_NOTE_HEADING }
      : null,
  ]
    .filter((marker): marker is NonNullable<typeof marker> => marker !== null)
    .sort((left, right) => left.at - right.at)

  if (markers.length === 0) {
    return { source: content.trimEnd(), draft: '', notes: '' }
  }

  const source = content.slice(0, markers[0].at).trimEnd()
  let draft = ''
  let notes = ''

  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index]
    const end = index + 1 < markers.length ? markers[index + 1].at : content.length
    const body = bodyBetween(content, marker.at, marker.heading, end)
    if (marker.kind === 'draft') {
      draft = body.trim()
    } else {
      notes = body.trimEnd()
    }
  }

  return { source, draft, notes }
}

export function composeInboxWorkingCopy(parts: InboxWorkingCopyParts): string {
  let next = parts.source.trimEnd()
  const draft = parts.draft.trim()
  const notes = parts.notes.trim()

  if (draft) {
    next = `${next}\n\n${KFZ_RESPONSE_DRAFT_HEADING}\n${draft}`
  }

  if (notes) {
    next = `${next}\n\n${KFZ_INTERNAL_NOTE_HEADING}\n${notes}`
  }

  return next
}

export function readKfzResponseDraft(content: string): string {
  return splitInboxWorkingCopy(content).draft
}

export function readInboxSourceContent(content: string): string {
  return splitInboxWorkingCopy(content).source
}

export function hasKfzResponseDraft(content: string): boolean {
  return readKfzResponseDraft(content).length > 0
}

export function applyKfzResponseDraft(
  content: string,
  draft: string,
): KfzResponseDraftApplyResult {
  if (draft.length > KFZ_RESPONSE_DRAFT_MAX_LENGTH) {
    return {
      ok: false,
      error: `Der Entwurf darf höchstens ${KFZ_RESPONSE_DRAFT_MAX_LENGTH} Zeichen lang sein.`,
    }
  }

  const parts = splitInboxWorkingCopy(content)
  const nextDraft = draft.trim()
  const next = composeInboxWorkingCopy({ ...parts, draft: nextDraft })

  return {
    ok: true,
    content: next,
    mutated: next !== content.trimEnd() && next !== content,
  }
}
