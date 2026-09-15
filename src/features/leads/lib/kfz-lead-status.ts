/**
 * Minimal Kfz lead lifecycle on the existing inbox working copy.
 * Status lives in operator notes + processed_at — no parallel CRM, no migration.
 */

import { isKfzInboxItem } from '@/features/ai-inbound/lib/is-kfz-website-inbox-item'
import { hasKfzContactedNote, KFZ_CONTACTED_NOTE } from '@/features/inbox/lib/kfz-reply-handoff'
import {
  composeInboxWorkingCopy,
  splitInboxWorkingCopy,
} from '@/features/inbox/lib/kfz-response-draft'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export const KFZ_LEAD_STATUSES = [
  'new',
  'contacted',
  'appointment',
  'won',
  'lost',
] as const

export type KfzLeadStatus = (typeof KFZ_LEAD_STATUSES)[number]

export const OPEN_KFZ_LEAD_STATUSES: readonly KfzLeadStatus[] = [
  'new',
  'contacted',
  'appointment',
]

export const KFZ_LEAD_STATUS_LABELS: Record<KfzLeadStatus, string> = {
  new: 'Neu',
  contacted: 'Kontaktiert',
  appointment: 'Termin/Angebot',
  won: 'Gewonnen',
  lost: 'Verloren',
}

export const KFZ_LEAD_STATUS_PREFIX = 'Lead-Status:' as const

export const KFZ_LEAD_STATUS_LINES: Record<KfzLeadStatus, string> = {
  new: 'Lead-Status: Neu. Interner Stand — kein automatischer Kundenkontakt.',
  contacted: 'Lead-Status: Kontaktiert. Manuell bestätigt — kein automatischer Versand.',
  appointment:
    'Lead-Status: Termin/Angebot. Interner Stand — kein Vorgang automatisch angelegt.',
  won: 'Lead-Status: Gewonnen. Manuell abgeschlossen — kein automatischer Kundenkontakt.',
  lost: 'Lead-Status: Verloren. Manuell abgeschlossen — kein automatischer Kundenkontakt.',
}

export const KFZ_LEAD_NO_AUTO_ACTION =
  'Nichts wird automatisch gesendet oder als Vorgang angelegt.'

export const KFZ_LEAD_NO_AUTO_VORGANG =
  'Ein Vorgang entsteht nur durch explizite Übernahme — nicht automatisch durch den Lead.'

export type KfzLeadStatusChipKind = 'new' | 'review' | 'gaps' | 'handled'

export const KFZ_LEAD_STATUS_CHIP: Record<KfzLeadStatus, KfzLeadStatusChipKind> = {
  new: 'new',
  contacted: 'review',
  appointment: 'gaps',
  won: 'handled',
  lost: 'handled',
}

export type KfzLeadWorkingCopy = {
  content: string
  processed_at: string | null
}

export type KfzLeadStatusApplyResult =
  | {
      ok: true
      next: KfzLeadWorkingCopy
      mutated: { content: boolean; processed: boolean }
    }
  | { ok: false; error: string }

export function isKfzLeadStatus(value: string | null | undefined): value is KfzLeadStatus {
  return (
    value === 'new' ||
    value === 'contacted' ||
    value === 'appointment' ||
    value === 'won' ||
    value === 'lost'
  )
}

export function isOpenKfzLeadStatus(status: KfzLeadStatus): boolean {
  return OPEN_KFZ_LEAD_STATUSES.includes(status)
}

function readLeadStatusFromLine(line: string): KfzLeadStatus | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith(KFZ_LEAD_STATUS_PREFIX)) {
    return null
  }

  for (const status of KFZ_LEAD_STATUSES) {
    if (trimmed === KFZ_LEAD_STATUS_LINES[status]) {
      return status
    }
    const label = KFZ_LEAD_STATUS_LABELS[status]
    if (trimmed.startsWith(`${KFZ_LEAD_STATUS_PREFIX} ${label}`)) {
      return status
    }
  }

  return null
}

export function readExplicitKfzLeadStatus(content: string): KfzLeadStatus | null {
  const notes = splitInboxWorkingCopy(content).notes
  const lines = notes.split('\n').map((line) => line.trim()).filter(Boolean)

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const status = readLeadStatusFromLine(lines[index])
    if (status) {
      return status
    }
  }

  return null
}

export function resolveKfzLeadStatus(
  item: Pick<InboxItem, 'content' | 'processed_at'>,
): KfzLeadStatus {
  const explicit = readExplicitKfzLeadStatus(item.content)
  if (explicit) {
    return explicit
  }

  if (hasKfzContactedNote(item.content)) {
    return 'contacted'
  }

  return 'new'
}

export function isKfzLeadItem(
  item: Pick<InboxItem, 'channel' | 'source' | 'inbound_metadata' | 'title' | 'content'>,
): boolean {
  return isKfzInboxItem(item)
}

export function isOpenKfzLead(
  item: Pick<
    InboxItem,
    'channel' | 'source' | 'inbound_metadata' | 'title' | 'content' | 'processed_at'
  >,
): boolean {
  if (!isKfzLeadItem(item)) {
    return false
  }

  return isOpenKfzLeadStatus(resolveKfzLeadStatus(item))
}

export function countOpenKfzLeads(
  items: ReadonlyArray<
    Pick<
      InboxItem,
      'channel' | 'source' | 'inbound_metadata' | 'title' | 'content' | 'processed_at'
    >
  >,
): number {
  return items.filter((item) => isOpenKfzLead(item)).length
}

export function buildKfzLeadNextAction(status: KfzLeadStatus): string {
  const suffix = KFZ_LEAD_NO_AUTO_ACTION

  if (status === 'new') {
    return `Kontakt manuell aufnehmen und als kontaktiert markieren. ${suffix}`
  }
  if (status === 'contacted') {
    return `Termin oder Angebot intern vorbereiten. ${KFZ_LEAD_NO_AUTO_VORGANG}`
  }
  if (status === 'appointment') {
    return `Lead qualifizieren — gewonnen oder verloren. Optional explizit als Angebot übernehmen. ${suffix}`
  }
  if (status === 'won') {
    return `Lead gewonnen. Kein weiterer automatischer Schritt. ${suffix}`
  }
  return `Lead verloren. Kein weiterer automatischer Schritt. ${suffix}`
}

function writeLeadStatusNotes(content: string, status: KfzLeadStatus): string {
  const parts = splitInboxWorkingCopy(content)
  const kept = parts.notes
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => {
      const trimmed = line.trim()
      return trimmed.length > 0 && !trimmed.startsWith(KFZ_LEAD_STATUS_PREFIX)
    })

  kept.push(KFZ_LEAD_STATUS_LINES[status])

  if (status === 'contacted' && !kept.some((line) => line.includes(KFZ_CONTACTED_NOTE))) {
    kept.push(KFZ_CONTACTED_NOTE)
  }

  return composeInboxWorkingCopy({
    ...parts,
    notes: kept.join('\n'),
  })
}

/**
 * Pure status transition. Calling this without an explicit status leaves the copy unchanged.
 * Won / lost close the inbox item. Open statuses reopen it. No Vorgang is created.
 */
export function applyKfzLeadStatusCommand(
  current: KfzLeadWorkingCopy,
  status: KfzLeadStatus | null,
  at = new Date().toISOString(),
): KfzLeadStatusApplyResult {
  if (!status) {
    return {
      ok: true,
      next: { ...current },
      mutated: { content: false, processed: false },
    }
  }

  if (!isKfzLeadStatus(status)) {
    return { ok: false, error: 'Der Lead-Status ist ungültig.' }
  }

  const nextContent = writeLeadStatusNotes(current.content, status)
  const nextProcessedAt = isOpenKfzLeadStatus(status) ? null : at || current.processed_at
  const next: KfzLeadWorkingCopy = {
    content: nextContent,
    processed_at: nextProcessedAt,
  }

  return {
    ok: true,
    next,
    mutated: {
      content: next.content !== current.content,
      processed: next.processed_at !== current.processed_at,
    },
  }
}
