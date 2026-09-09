/**
 * Manual preferred-channel reply handoff for a reviewed Kfz inbox item.
 * WhatsApp is a preference only. Copying never marks contact. Nothing is sent.
 */

import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import {
  hasKfzResponseDraft,
  readKfzResponseDraft,
} from '@/features/inbox/lib/kfz-response-draft'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export const KFZ_WHATSAPP_PREFERENCE_ONLY =
  'WhatsApp ist nur eine Präferenz. Es wird kein Meta-Dienst verbunden und keine Nachricht gesendet.'

export const KFZ_COPY_NO_STATUS_CHANGE =
  'Kopieren ändert den Status nicht. Kontakt gilt nur nach expliziter Bestätigung.'

export const KFZ_PREFERRED_CONTACT_MISSING =
  'Kontaktwert für den bevorzugten Kanal fehlt'

export const KFZ_REPLY_PREPARED_NOTE =
  'Antwort vorbereitet. Interner Entwurf — kein automatischer Kundenkontakt.'

export const KFZ_CONTACTED_NOTE =
  'Manuell als kontaktiert markiert. Kein automatischer Versand.'

export const KFZ_FOLLOW_UP_NOTE =
  'Rückfrage nötig. Weitere interne Klärung — kein automatischer Kundenkontakt.'

export const KFZ_CALL_PREP_TITLE = 'Gesprächsvorbereitung' as const

export const KFZ_CALL_PREP_NO_ADVICE =
  'Nur vorliegende Angaben — keine Rechts- oder Tarifauskunft, keine Preise oder Zusagen.'

export const KFZ_HANDOFF_NO_SEND =
  'Nichts wird automatisch gesendet oder nach außen übertragen.'

export type KfzPreferredChannelKind = 'phone' | 'email' | 'whatsapp'

export type KfzReplyHandoffState =
  | 'needs_prepare'
  | 'preparing'
  | 'contacted'
  | 'follow_up'
  | 'handled'

export type KfzReplyHandoffActionId =
  | 'prepare_reply'
  | 'mark_contacted'
  | 'mark_follow_up'
  | 'mark_handled'

export type KfzPreferredChannelContact = {
  channel: KfzPreferredChannelKind | null
  channelLabel: string
  contactValue: string | null
  contactKind: 'phone' | 'email' | null
  contactMissing: boolean
  whatsAppIsPreferenceOnly: boolean
  preferenceOnlyLabel: string | null
}

export type KfzCallPrepFact = {
  id: string
  label: string
  value: string
}

export type KfzCallPreparation = {
  visible: boolean
  title: typeof KFZ_CALL_PREP_TITLE
  noAdviceLabel: typeof KFZ_CALL_PREP_NO_ADVICE
  facts: KfzCallPrepFact[]
  missingInformation: string[]
}

export type KfzCopyTargets = {
  phone: string | null
  email: string | null
  preferredContact: string | null
  draft: string
}

export type KfzCopyKind = keyof KfzCopyTargets

export type KfzReplyHandoffView = {
  state: KfzReplyHandoffState
  primaryActionId: KfzReplyHandoffActionId | null
  primaryActionLabel: string
  whatsAppIsPreferenceOnly: boolean
}

export function isKfzPreferredChannel(
  value: string | null | undefined,
): value is KfzPreferredChannelKind {
  return value === 'phone' || value === 'email' || value === 'whatsapp'
}

export function labelKfzPreferredChannel(channel: string | null | undefined): string {
  if (channel === 'phone') {
    return 'Telefon'
  }
  if (channel === 'email') {
    return 'E-Mail'
  }
  if (channel === 'whatsapp') {
    return 'WhatsApp'
  }
  return 'Nicht angegeben'
}

export function resolvePreferredChannelContact(input: {
  preferredChannel: string | null
  phone: string | null
  email: string | null
}): KfzPreferredChannelContact {
  const channel = isKfzPreferredChannel(input.preferredChannel)
    ? input.preferredChannel
    : null
  const channelLabel = labelKfzPreferredChannel(channel)
  const contactKind: 'phone' | 'email' | null =
    channel === 'email' ? 'email' : channel ? 'phone' : null
  const contactValue =
    contactKind === 'email' ? input.email : contactKind === 'phone' ? input.phone : null
  const contactMissing = channel !== null && !contactValue

  return {
    channel,
    channelLabel,
    contactValue,
    contactKind,
    contactMissing,
    whatsAppIsPreferenceOnly: channel === 'whatsapp',
    preferenceOnlyLabel: channel === 'whatsapp' ? KFZ_WHATSAPP_PREFERENCE_ONLY : null,
  }
}

export function buildKfzCallPreparation(input: {
  preferredChannel: string | null
  customerName: string
  phone: string | null
  location: string | null
  request: string
  vehicle: string | null
  missingInformation: string[]
}): KfzCallPreparation {
  if (input.preferredChannel !== 'phone') {
    return {
      visible: false,
      title: KFZ_CALL_PREP_TITLE,
      noAdviceLabel: KFZ_CALL_PREP_NO_ADVICE,
      facts: [],
      missingInformation: [],
    }
  }

  const facts: KfzCallPrepFact[] = [
    { id: 'customer', label: 'Kunde', value: input.customerName },
  ]

  if (input.phone) {
    facts.push({ id: 'phone', label: 'Telefon', value: input.phone })
  }

  if (input.request && input.request !== 'Nicht angegeben') {
    facts.push({ id: 'request', label: 'Anliegen', value: input.request })
  }

  if (input.vehicle) {
    facts.push({ id: 'vehicle', label: 'Fahrzeug', value: input.vehicle })
  }

  if (input.location) {
    facts.push({ id: 'location', label: 'Ort', value: input.location })
  }

  return {
    visible: true,
    title: KFZ_CALL_PREP_TITLE,
    noAdviceLabel: KFZ_CALL_PREP_NO_ADVICE,
    facts,
    missingInformation: input.missingInformation,
  }
}

export function hasKfzReplyPreparedNote(content: string): boolean {
  return content.includes(KFZ_REPLY_PREPARED_NOTE)
}

export function hasKfzContactedNote(content: string): boolean {
  return content.includes(KFZ_CONTACTED_NOTE)
}

export function hasKfzFollowUpNote(content: string): boolean {
  return content.includes(KFZ_FOLLOW_UP_NOTE)
}

export function isKfzReplyHandoffNote(line: string): boolean {
  return (
    line === KFZ_REPLY_PREPARED_NOTE ||
    line === KFZ_CONTACTED_NOTE ||
    line === KFZ_FOLLOW_UP_NOTE
  )
}

export function resolveKfzReplyHandoffState(
  item: Pick<InboxItem, 'processed_at' | 'content'>,
): KfzReplyHandoffState {
  if (!isInboxItemUnprocessed(item)) {
    return 'handled'
  }
  if (hasKfzFollowUpNote(item.content)) {
    return 'follow_up'
  }
  if (hasKfzContactedNote(item.content)) {
    return 'contacted'
  }
  if (hasKfzReplyPreparedNote(item.content)) {
    return 'preparing'
  }
  return 'needs_prepare'
}

export function buildKfzReplyHandoffView(
  item: Pick<InboxItem, 'processed_at' | 'content'>,
  preferredChannel: string | null = null,
): KfzReplyHandoffView {
  const state = resolveKfzReplyHandoffState(item)
  const whatsAppIsPreferenceOnly = preferredChannel === 'whatsapp'

  if (state === 'handled') {
    return {
      state,
      primaryActionId: null,
      primaryActionLabel: `Bereits manuell als erledigt markiert. ${KFZ_HANDOFF_NO_SEND}`,
      whatsAppIsPreferenceOnly,
    }
  }

  if (state === 'follow_up') {
    return {
      state,
      primaryActionId: 'mark_handled',
      primaryActionLabel: 'Als erledigt markieren',
      whatsAppIsPreferenceOnly,
    }
  }

  if (state === 'contacted') {
    return {
      state,
      primaryActionId: 'mark_handled',
      primaryActionLabel: 'Als erledigt markieren',
      whatsAppIsPreferenceOnly,
    }
  }

  if (state === 'preparing') {
    return {
      state,
      primaryActionId: 'mark_contacted',
      primaryActionLabel: 'Als kontaktiert markieren',
      whatsAppIsPreferenceOnly,
    }
  }

  return {
    state,
    primaryActionId: 'prepare_reply',
    primaryActionLabel: 'Antwort vorbereiten',
    whatsAppIsPreferenceOnly,
  }
}

export function readKfzCopyTargets(input: {
  phone: string | null
  email: string | null
  preferredContact: string | null
  content: string
}): KfzCopyTargets {
  return {
    phone: input.phone,
    email: input.email,
    preferredContact: input.preferredContact,
    draft: readKfzResponseDraft(input.content),
  }
}

/**
 * Returns the exact text an employee may copy. Never mutates status or content.
 */
export function readKfzCopyValue(
  targets: KfzCopyTargets,
  kind: KfzCopyKind,
): string | null {
  const value = targets[kind]
  if (!value || value.trim().length === 0) {
    return null
  }
  return value
}

export function copyDoesNotChangeStatus(): {
  mutated: { content: false; processed: false; task: false; contacted: false }
  noExternalSideEffect: true
} {
  return {
    mutated: {
      content: false,
      processed: false,
      task: false,
      contacted: false,
    },
    noExternalSideEffect: true,
  }
}

export function replyHandoffUsesExistingDraft(content: string): boolean {
  return hasKfzResponseDraft(content)
}
