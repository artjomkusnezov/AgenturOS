/**
 * Local synthetic Kfz leads for the employee preview.
 * Not production inbox data and not a customer send path.
 */

import { composeInboxWorkingCopy } from '@/features/inbox/lib/kfz-response-draft'
import { KFZ_CONTACTED_NOTE } from '@/features/inbox/lib/kfz-reply-handoff'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import type { Json } from '@/lib/supabase/types'
import {
  applyKfzLeadStatusCommand,
  KFZ_LEAD_STATUS_LINES,
  type KfzLeadStatus,
} from '@/features/leads/lib/kfz-lead-status'

export const KFZ_LEADS_PREVIEW_PATH = '/dev/leads' as const
export const KFZ_LEADS_DASHBOARD_PREVIEW_PATH = '/dev/leads-dashboard' as const
export const KFZ_LEADS_PREVIEW_STORAGE_KEY = 'agenturos:kfz-leads-preview' as const

export const KFZ_LEADS_PREVIEW_NEW_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa51'
export const KFZ_LEADS_PREVIEW_CONTACTED_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa52'
export const KFZ_LEADS_PREVIEW_APPOINTMENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa53'
export const KFZ_LEADS_PREVIEW_WON_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa54'
export const KFZ_LEADS_PREVIEW_AGENCY_ID = '11111111-1111-4111-8111-111111111111'
export const KFZ_LEADS_PREVIEW_DOCUMENT_OBJECT_KEY =
  `kfz/${KFZ_LEADS_PREVIEW_AGENCY_ID}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa99` as const

type PreviewLead = {
  id: string
  name: string
  reason: string
  phone: string | null
  email: string | null
  preferredChannel: 'phone' | 'email' | 'whatsapp'
  vehicle: { make: string | null; model: string | null; year: string | null }
  notes: string
  processedAt: string | null
  createdAt: string
  contextNotes?: string
  utm?: {
    source?: string
    campaign?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
  }
  questionnaire?: {
    branchLabel: string
    answers: Array<{ id: string; label: string; value: string }>
    missingFacts?: string[]
  }
  uploadMeta?: Array<{
    filename: string
    mimeType?: string | null
    sizeBytes?: number | null
    group?: 'fahrzeugschein' | 'vorversicherung' | null
    objectKey?: string
  }>
}

function buildPreviewLead(input: PreviewLead): InboxItem {
  const vehicleLabel = [input.vehicle.make, input.vehicle.model, input.vehicle.year]
    .filter(Boolean)
    .join(' ')
  const source = [
    `Kfz-Anfrage von ${input.name}`,
    'Ort: 49525 Lengerich',
    `Anliegen: ${input.reason}`,
    `Bevorzugter Kanal: ${input.preferredChannel}`,
    input.phone ? `Telefon: ${input.phone}` : null,
    input.email ? `E-Mail: ${input.email}` : null,
    vehicleLabel ? `Fahrzeug: ${vehicleLabel}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    id: input.id,
    agency_id: KFZ_LEADS_PREVIEW_AGENCY_ID,
    user_id: '22222222-2222-4222-8222-222222222222',
    channel: 'website',
    source: 'website',
    title: `Kfz-Anfrage · ${input.name}`,
    content: composeInboxWorkingCopy({
      source,
      draft: '',
      notes: input.notes,
    }),
    processed_at: input.processedAt,
    created_at: input.createdAt,
    updated_at: input.createdAt,
    received_at: input.createdAt,
    external_id: `kfz:preview-lead-${input.id.slice(-2)}`,
    origin: null,
    message_kind: 'text',
    detected_language: 'de',
    transcript_text: null,
    transcription_completed_at: null,
    transcription_error: null,
    transcription_model: null,
    transcription_provider: null,
    transcription_started_at: null,
    transcription_status: 'none',
    sender: {
      displayName: input.name,
      address: input.phone ?? input.email ?? '',
      addressKind: input.phone ? 'phone' : 'email',
    },
    inbound_metadata: {
      acquisition: {
        family: 'website',
        product: 'kfz',
        source: input.utm?.source ?? 'kfz.artkus.de',
        campaign: input.utm?.campaign ?? null,
        utmSource: input.utm?.utmSource ?? null,
        utmMedium: input.utm?.utmMedium ?? null,
        utmCampaign: input.utm?.utmCampaign ?? null,
      },
      inquiry: {
        reason: input.reason,
        preferredChannel: input.preferredChannel,
        phone: input.phone,
        email: input.email,
        contextNotes: input.contextNotes ?? null,
        location: { postalCode: '49525', city: 'Lengerich' },
        vehicle: input.vehicle,
        ...(input.questionnaire
          ? {
              questionnaire: {
                branchId: 'switch_car',
                branchLabel: input.questionnaire.branchLabel,
                path: 'questionnaire',
                answers: input.questionnaire.answers,
                missingFacts: input.questionnaire.missingFacts ?? [],
                boundaries: ['Keine Rechts- oder Tarifauskunft in dieser Strecke.'],
              },
            }
          : {}),
      },
      ...(input.uploadMeta && input.uploadMeta.length > 0 ? { uploadMeta: input.uploadMeta } : {}),
    } as Json,
  }
}

export function buildKfzLeadsPreviewItems(): {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
} {
  const fresh = buildPreviewLead({
    id: KFZ_LEADS_PREVIEW_NEW_ID,
    name: 'Max Mustermann',
    reason: 'Wechsel Kfz-Versicherung',
    phone: '+491701234567',
    email: 'max@example.com',
    preferredChannel: 'phone',
    vehicle: { make: 'VW', model: 'Golf', year: '2019' },
    notes: '',
    processedAt: null,
    createdAt: '2026-09-15T08:10:00.000Z',
    contextNotes: 'Kennzeichen OS-AB 1234 liegt vor.',
    utm: {
      source: 'kfz.artkus.de',
      campaign: 'kfz-check',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'kfz-check',
    },
    questionnaire: {
      branchLabel: 'Fahrzeug wechseln',
      answers: [
        { id: 'start_date', label: 'Versicherungsbeginn', value: '01.10.2026' },
        { id: 'coverage', label: 'Gewünschter Schutz', value: 'Vollkasko' },
        { id: 'has_previous_kfz', label: 'Vorversicherung', value: 'Ja' },
        { id: 'previous_insurer', label: 'Vorversicherer', value: 'HUK-COBURG' },
        { id: 'has_claims', label: 'Schäden in den letzten Jahren', value: 'Nein' },
      ],
    },
    uploadMeta: [
      {
        filename: 'fahrzeugschein.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 240_000,
        group: 'fahrzeugschein',
        objectKey: KFZ_LEADS_PREVIEW_DOCUMENT_OBJECT_KEY,
      },
    ],
  })

  const contacted = buildPreviewLead({
    id: KFZ_LEADS_PREVIEW_CONTACTED_ID,
    name: 'Lisa Unfall',
    reason: 'Unfall Kfz-Versicherung',
    phone: null,
    email: 'lisa@example.com',
    preferredChannel: 'email',
    vehicle: { make: null, model: null, year: null },
    notes: `${KFZ_LEAD_STATUS_LINES.contacted}\n${KFZ_CONTACTED_NOTE}`,
    processedAt: null,
    createdAt: '2026-09-15T07:40:00.000Z',
    contextNotes: 'Sofort nach Schaden melden',
  })

  const appointment = buildPreviewLead({
    id: KFZ_LEADS_PREVIEW_APPOINTMENT_ID,
    name: 'Anna Beispiel',
    reason: 'Zusätzliches Auto versichern',
    phone: '+491701112223',
    email: null,
    preferredChannel: 'phone',
    vehicle: { make: 'Tesla', model: 'Model 3', year: '2023' },
    notes: KFZ_LEAD_STATUS_LINES.appointment,
    processedAt: null,
    createdAt: '2026-09-14T16:20:00.000Z',
    questionnaire: {
      branchLabel: 'Weiteres Auto',
      answers: [
        { id: 'coverage', label: 'Gewünschter Schutz', value: 'Teilkasko' },
        { id: 'start_date', label: 'Versicherungsbeginn', value: '01.11.2026' },
      ],
    },
  })

  const won = buildPreviewLead({
    id: KFZ_LEADS_PREVIEW_WON_ID,
    name: 'Paul Fertig',
    reason: 'Preischeck Kfz-Versicherung',
    phone: '+491709998877',
    email: null,
    preferredChannel: 'phone',
    vehicle: { make: 'Opel', model: 'Corsa', year: '2018' },
    notes: KFZ_LEAD_STATUS_LINES.won,
    processedAt: '2026-09-14T18:00:00.000Z',
    createdAt: '2026-09-13T09:00:00.000Z',
  })

  return {
    unprocessedItems: [fresh, contacted, appointment],
    processedItems: [won],
  }
}

export function applyPreviewLeadStatus(items: InboxItem[], itemId: string, status: KfzLeadStatus): InboxItem[] {
  return items.map((item) => {
    if (item.id !== itemId) {
      return item
    }
    const applied = applyKfzLeadStatusCommand(
      { content: item.content, processed_at: item.processed_at },
      status,
      '2026-09-15T12:00:00.000Z',
    )
    if (!applied.ok) {
      return item
    }
    return {
      ...item,
      content: applied.next.content,
      processed_at: applied.next.processed_at,
      updated_at: '2026-09-15T12:00:00.000Z',
    }
  })
}

export function splitPreviewLeadItems(items: InboxItem[]): {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
} {
  return {
    unprocessedItems: items.filter((item) => item.processed_at === null),
    processedItems: items.filter((item) => item.processed_at !== null),
  }
}

export const KFZ_LEADS_PREVIEW_CASE_VIEWS = [
  { key: 'tasks', name: 'Aufgaben', icon: 'tasks', href: '/app/tasks' },
  { key: 'offers', name: 'Angebote', icon: 'offer', href: '/app/cases?view=offers' },
  { key: 'claims', name: 'Schäden', icon: 'claim', href: '/app/cases?view=claims' },
  { key: 'follow-ups', name: 'Wiedervorlagen', icon: 'follow_up', href: '/app/cases?view=follow-ups' },
  { key: 'mortgage', name: 'Baufinanzierungen', icon: 'mortgage', href: '/app/cases?view=mortgage' },
] as const

export function resolveLeadsPreviewHref(href: string): string {
  if (href === '/app') {
    return KFZ_LEADS_DASHBOARD_PREVIEW_PATH
  }
  if (href === '/app/leads') {
    return KFZ_LEADS_PREVIEW_PATH
  }
  if (href === '/app/inbox') {
    return '/dev/inbox'
  }
  return href
}
