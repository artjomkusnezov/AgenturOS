import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { KFZ_CONTACTED_NOTE } from '@/features/inbox/lib/kfz-reply-handoff'
import { composeInboxWorkingCopy } from '@/features/inbox/lib/kfz-response-draft'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import {
  applyKfzLeadStatusCommand,
  countOpenKfzLeads,
  isOpenKfzLead,
  KFZ_LEAD_NO_AUTO_VORGANG,
  KFZ_LEAD_STATUS_LINES,
  resolveKfzLeadStatus,
} from '@/features/leads/lib/kfz-lead-status'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'

function kfzItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa61',
    agency_id: AGENCY_ID,
    user_id: ACTOR_ID,
    channel: 'website',
    source: 'website',
    title: 'Kfz-Anfrage · Max Mustermann',
    content: 'Kfz-Anfrage von Max Mustermann',
    processed_at: null,
    inbound_metadata: {
      acquisition: { family: 'website', product: 'kfz' },
    },
    sender: { displayName: 'Max Mustermann', address: '+49170', addressKind: 'phone' },
    origin: null,
    detected_language: 'de',
    external_id: 'kfz:status-test',
    message_kind: 'text',
    received_at: '2026-09-15T08:00:00.000Z',
    transcript_text: null,
    transcription_completed_at: null,
    transcription_error: null,
    transcription_model: null,
    transcription_provider: null,
    transcription_started_at: null,
    transcription_status: 'none',
    created_at: '2026-09-15T08:00:00.000Z',
    updated_at: '2026-09-15T08:00:00.000Z',
    ...overrides,
  }
}

function emailItem(): InboxItem {
  return kfzItem({
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb61',
    channel: 'email',
    source: 'email',
    title: 'Police',
    content: 'Eine E-Mail',
    inbound_metadata: {},
    external_id: null,
  })
}

describe('kfz lead status lifecycle', () => {
  it('starts as Neu and maps the existing contacted note', () => {
    assert.equal(resolveKfzLeadStatus(kfzItem()), 'new')
    assert.equal(
      resolveKfzLeadStatus(
        kfzItem({
          content: composeInboxWorkingCopy({
            source: 'Kfz-Anfrage',
            draft: '',
            notes: KFZ_CONTACTED_NOTE,
          }),
        }),
      ),
      'contacted',
    )
  })

  it('lets an explicit Lead-Status line win over older notes', () => {
    const item = kfzItem({
      content: composeInboxWorkingCopy({
        source: 'Kfz-Anfrage',
        draft: '',
        notes: `${KFZ_CONTACTED_NOTE}\n${KFZ_LEAD_STATUS_LINES.appointment}`,
      }),
    })
    assert.equal(resolveKfzLeadStatus(item), 'appointment')
  })

  it('applies Neu → Kontaktiert → Termin/Angebot → Gewonnen without creating a Vorgang', () => {
    let current = { content: 'Kfz-Anfrage von Max', processed_at: null as string | null }

    const contacted = applyKfzLeadStatusCommand(current, 'contacted', '2026-09-15T09:00:00.000Z')
    assert.equal(contacted.ok, true)
    if (!contacted.ok) {
      return
    }
    assert.equal(contacted.next.processed_at, null)
    assert.match(contacted.next.content, /Lead-Status: Kontaktiert/)
    assert.match(contacted.next.content, new RegExp(KFZ_CONTACTED_NOTE))
    current = contacted.next

    const appointment = applyKfzLeadStatusCommand(current, 'appointment', '2026-09-15T10:00:00.000Z')
    assert.equal(appointment.ok, true)
    if (!appointment.ok) {
      return
    }
    assert.equal(appointment.next.processed_at, null)
    assert.match(appointment.next.content, /Lead-Status: Termin\/Angebot/)
    assert.doesNotMatch(appointment.next.content, /Lead-Status: Kontaktiert/)
    current = appointment.next

    const won = applyKfzLeadStatusCommand(current, 'won', '2026-09-15T11:00:00.000Z')
    assert.equal(won.ok, true)
    if (!won.ok) {
      return
    }
    assert.equal(won.next.processed_at, '2026-09-15T11:00:00.000Z')
    assert.match(won.next.content, /Lead-Status: Gewonnen/)
    assert.equal(resolveKfzLeadStatus({ ...kfzItem(), ...won.next }), 'won')
  })

  it('marks Verloren as closed and can reopen to Neu', () => {
    const lost = applyKfzLeadStatusCommand(
      { content: 'Kfz-Anfrage', processed_at: null },
      'lost',
      '2026-09-15T12:00:00.000Z',
    )
    assert.equal(lost.ok, true)
    if (!lost.ok) {
      return
    }
    assert.equal(lost.next.processed_at, '2026-09-15T12:00:00.000Z')
    assert.equal(resolveKfzLeadStatus({ ...kfzItem(), ...lost.next }), 'lost')

    const reopened = applyKfzLeadStatusCommand(lost.next, 'new', '2026-09-15T12:30:00.000Z')
    assert.equal(reopened.ok, true)
    if (!reopened.ok) {
      return
    }
    assert.equal(reopened.next.processed_at, null)
    assert.equal(resolveKfzLeadStatus({ ...kfzItem(), ...reopened.next }), 'new')
  })

  it('counts only open Kfz leads and ignores e-mail inbox items', () => {
    const neu = kfzItem()
    const gewonnen = kfzItem({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa62',
      content: composeInboxWorkingCopy({
        source: 'Kfz-Anfrage',
        draft: '',
        notes: KFZ_LEAD_STATUS_LINES.won,
      }),
      processed_at: '2026-09-15T11:00:00.000Z',
    })
    const mail = emailItem()

    assert.equal(isOpenKfzLead(neu), true)
    assert.equal(isOpenKfzLead(gewonnen), false)
    assert.equal(isOpenKfzLead(mail), false)
    assert.equal(countOpenKfzLeads([neu, gewonnen, mail]), 1)
    assert.match(KFZ_LEAD_NO_AUTO_VORGANG, /nicht automatisch/)
  })
})
