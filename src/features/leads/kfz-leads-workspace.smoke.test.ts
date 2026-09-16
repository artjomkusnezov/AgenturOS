/**
 * Employee Leads workspace: selection, open-lead count, status and navigation.
 * Uses normalized inbound records — never preview fixtures on the production path.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import {
  buildVorgaengeChildNavItems,
  getNavItemByPathname,
  isCaseViewNavActive,
  isNavItemActive,
  LEADS_NAV_HREF,
  LEADS_NAV_ITEM,
} from '@/config/app-navigation'
import { buildKfzDocumentReviewHref } from '@/features/inbound/kfz/lib/kfz-document-storage'
import { KFZ_DOCUMENT_REVIEW_PATH } from '@/features/inbound/kfz/types/kfz-document-storage'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import {
  buildKfzLandingPayload,
  type KfzLandingAttribution,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import { resetRateLimitBucketsForTests } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'
import { applyKfzLeadStatusCommand, countOpenKfzLeads } from '@/features/leads/lib/kfz-lead-status'
import {
  buildKfzLeadHref,
  KFZ_LEADS_HREF_BASE,
  presentKfzLeadsWorkspace,
} from '@/features/leads/lib/present-kfz-leads'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-kfz-leads-workspace-secret'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const PRODUCTION_ROUTE_FILES = [
  'app/app/leads/page.tsx',
  'features/dashboard/components/dashboard-page-content.tsx',
  'features/dashboard/components/agenturzentrale-dashboard.tsx',
  'features/leads/lib/present-kfz-leads.ts',
] as const

function baseValues(overrides: Partial<KfzLandingFormValues> = {}): KfzLandingFormValues {
  return {
    fullName: 'Max Mustermann',
    postalCode: '49525',
    city: 'Lengerich',
    phone: '+491701234567',
    email: '',
    preferredChannel: 'phone',
    inquiryReason: 'Wechsel Kfz-Versicherung',
    inquiryProcessingConsent: true,
    vehicleMake: 'VW',
    vehicleModel: 'Golf',
    vehicleYear: '2019',
    contextNotes: '',
    ...overrides,
  }
}

function withKfzEnv(run: () => Promise<void>): Promise<void> {
  const prev = {
    agency: process.env.INBOUND_KFZ_AGENCY_ID,
    actor: process.env.INBOUND_KFZ_ACTOR_USER_ID,
    secret: process.env.INBOUND_KFZ_INTAKE_SECRET,
    emailAgency: process.env.INBOUND_EMAIL_AGENCY_ID,
    emailActor: process.env.INBOUND_EMAIL_ACTOR_USER_ID,
  }

  process.env.INBOUND_KFZ_AGENCY_ID = AGENCY_ID
  process.env.INBOUND_KFZ_ACTOR_USER_ID = ACTOR_ID
  process.env.INBOUND_KFZ_INTAKE_SECRET = SECRET
  delete process.env.INBOUND_EMAIL_AGENCY_ID
  delete process.env.INBOUND_EMAIL_ACTOR_USER_ID

  return run().finally(() => {
    if (prev.agency === undefined) delete process.env.INBOUND_KFZ_AGENCY_ID
    else process.env.INBOUND_KFZ_AGENCY_ID = prev.agency
    if (prev.actor === undefined) delete process.env.INBOUND_KFZ_ACTOR_USER_ID
    else process.env.INBOUND_KFZ_ACTOR_USER_ID = prev.actor
    if (prev.secret === undefined) delete process.env.INBOUND_KFZ_INTAKE_SECRET
    else process.env.INBOUND_KFZ_INTAKE_SECRET = prev.secret
    if (prev.emailAgency === undefined) delete process.env.INBOUND_EMAIL_AGENCY_ID
    else process.env.INBOUND_EMAIL_AGENCY_ID = prev.emailAgency
    if (prev.emailActor === undefined) delete process.env.INBOUND_EMAIL_ACTOR_USER_ID
    else process.env.INBOUND_EMAIL_ACTOR_USER_ID = prev.emailActor
  })
}

function landingRequest(payload: unknown, secret = SECRET): Request {
  return new Request('http://localhost/api/inbound/kfz', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

async function submitLandingToInbox(
  values: KfzLandingFormValues,
  submissionId: string,
  attribution?: KfzLandingAttribution,
): Promise<InboxItem> {
  const built = buildKfzLandingPayload({
    values,
    submissionId,
    consentTimestamp: '2026-09-15T12:00:00.000Z',
    attribution,
  })
  assert.equal(built.ok, true)
  if (!built.ok) {
    throw new Error('expected landing payload')
  }

  const store = createMemoryInboundIntakeStore()
  const result = await handleKfzInboundHttpRequest(landingRequest(built.payload), {
    store,
  })

  assert.equal(result.ok, true)
  if (!result.ok) {
    throw new Error('expected HTTP success')
  }
  assert.equal(store.items.length, 1)
  return store.items[0]
}

function emailInboxItem(id: string): InboxItem {
  return {
    id,
    agency_id: AGENCY_ID,
    user_id: ACTOR_ID,
    channel: 'email',
    source: 'email',
    title: 'Police',
    content: 'Eine E-Mail',
    processed_at: null,
    inbound_metadata: {},
    sender: { displayName: 'Post', address: 'a@b.de', addressKind: 'email' },
    origin: null,
    detected_language: null,
    external_id: null,
    message_kind: null,
    received_at: '2026-09-15T12:00:00.000Z',
    transcript_text: null,
    transcription_completed_at: null,
    transcription_error: null,
    transcription_model: null,
    transcription_provider: null,
    transcription_started_at: null,
    transcription_status: 'idle',
    created_at: '2026-09-15T12:00:00.000Z',
    updated_at: '2026-09-15T12:00:00.000Z',
  }
}

describe('leads workspace selection, count and status', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('selects a persisted Kfz inquiry on /app/leads and shows captured facts', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-leads-open', {
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'kfz-check',
      })
      const mail = emailInboxItem('44444444-4444-4444-8444-444444444444')
      const view = presentKfzLeadsWorkspace({
        unprocessedItems: [item, mail],
        processedItems: [],
        selectedItemId: item.id,
      })

      assert.equal(view.usesPreviewFixtures, false)
      assert.equal(view.hrefBasePath, KFZ_LEADS_HREF_BASE)
      assert.equal(view.navLabel, 'Leads')
      assert.equal(view.statusFilter, 'open')
      assert.equal(view.openCount, 1)
      assert.equal(view.totalCount, 1)
      assert.equal(view.rows.length, 1)
      assert.equal(view.rows[0]?.href, `/app/leads?item=${item.id}`)
      assert.equal(view.selectedItemId, item.id)

      const detail = view.selectedDetail
      assert.ok(detail)
      assert.equal(detail.customerName, 'Max Mustermann')
      assert.equal(detail.status, 'new')
      assert.equal(detail.createsVorgangAutomatically, false)
      assert.equal(detail.documentPathAuthorized, true)
      assert.equal(detail.inboxHref, `/app/inbox?item=${item.id}`)
      assert.ok(detail.facts.some((fact) => fact.id === 'utm_source' && fact.value === 'google'))
      assert.ok(detail.facts.some((fact) => fact.id === 'utm_campaign' && fact.value === 'kfz-check'))
      assert.ok(detail.facts.some((fact) => fact.id === 'vehicle' && fact.value.includes('VW')))
      assert.ok(detail.facts.some((fact) => fact.id === 'customer' && fact.value === 'Max Mustermann'))
      assert.match(detail.nextAction, /kein Vorgang|Nichts wird automatisch/)
    })
  })

  it('keeps the Offene-Leads count real after a won status and leaves Eingang items untouched', async () => {
    await withKfzEnv(async () => {
      const openLead = await submitLandingToInbox(baseValues(), 'lp-leads-count-open')
      const closing = await submitLandingToInbox(baseValues({ fullName: 'Paul Fertig' }), 'lp-leads-count-won')
      const won = applyKfzLeadStatusCommand(
        { content: closing.content, processed_at: closing.processed_at },
        'won',
        '2026-09-15T18:00:00.000Z',
      )
      assert.equal(won.ok, true)
      if (!won.ok) {
        return
      }
      const closed = { ...closing, content: won.next.content, processed_at: won.next.processed_at }
      const mail = emailInboxItem('55555555-5555-4555-8555-555555555555')

      assert.equal(countOpenKfzLeads([openLead, closed, mail]), 1)

      const view = presentKfzLeadsWorkspace({
        unprocessedItems: [openLead, mail],
        processedItems: [closed],
        selectedItemId: closed.id,
        status: 'won',
      })
      assert.equal(view.openCount, 1)
      assert.equal(view.totalCount, 2)
      assert.equal(view.statusFilter, 'won')
      assert.equal(view.rows.length, 1)
      assert.equal(view.selectedDetail?.status, 'won')
      assert.equal(view.filterHrefs.won, `/app/leads?status=won&item=${closed.id}`)
      assert.equal(buildKfzLeadHref({ itemId: openLead.id }), `/app/leads?item=${openLead.id}`)
    })
  })

  it('keeps document review on the authorized private path', async () => {
    await withKfzEnv(async () => {
      const objectKey = `kfz/${AGENCY_ID}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa77`
      const item = await submitLandingToInbox(baseValues(), 'lp-leads-doc')
      const withDoc: InboxItem = {
        ...item,
        inbound_metadata: {
          ...(typeof item.inbound_metadata === 'object' && item.inbound_metadata
            ? item.inbound_metadata
            : {}),
          uploadMeta: [
            {
              filename: 'fahrzeugschein.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 12000,
              group: 'fahrzeugschein',
              objectKey,
            },
          ],
        },
      }
      const view = presentKfzLeadsWorkspace({
        unprocessedItems: [withDoc],
        processedItems: [],
        selectedItemId: withDoc.id,
      })
      const document = view.selectedDetail?.documents[0]
      assert.ok(document)
      assert.equal(document.objectKey, objectKey)
      assert.equal(document.reviewHref, buildKfzDocumentReviewHref(withDoc.id, objectKey))
      assert.match(document.reviewHref ?? '', new RegExp(KFZ_DOCUMENT_REVIEW_PATH))
      assert.doesNotMatch(document.reviewHref ?? '', /https?:\/\//)
    })
  })
})

describe('leads navigation and dashboard contract', () => {
  it('places Leads first under Vorgänge and keeps Aufgaben next', () => {
    const children = buildVorgaengeChildNavItems([
      { key: 'tasks', name: 'Aufgaben', icon: 'tasks', href: '/app/tasks' },
      { key: 'offers', name: 'Angebote', icon: 'offer', href: '/app/cases?view=offers' },
    ])
    assert.deepEqual(
      children.map((child) => child.name),
      ['Leads', 'Aufgaben', 'Angebote'],
    )
    assert.equal(children[0]?.href, LEADS_NAV_HREF)
    assert.equal(isCaseViewNavActive('/app/leads', new URLSearchParams(), 'leads'), true)
    assert.equal(isCaseViewNavActive('/app/leads', new URLSearchParams(), 'tasks'), false)
    assert.equal(isNavItemActive('/app/leads', '/app/cases'), false)
    assert.equal(isNavItemActive('/app/leads', LEADS_NAV_HREF), true)
    assert.equal(getNavItemByPathname('/app/leads')?.title, LEADS_NAV_ITEM.title)
    assert.equal(isNavItemActive('/app/tasks', '/app/cases'), false)
    assert.equal(isCaseViewNavActive('/app/tasks', new URLSearchParams(), 'tasks'), true)
  })

  it('wires production dashboard and leads paths without preview fixtures or outbound send', () => {
    for (const relativePath of PRODUCTION_ROUTE_FILES) {
      const source = fs.readFileSync(path.join(srcRoot, relativePath), 'utf8')
      assert.doesNotMatch(
        source,
        /kfz-leads-preview|KFZ_LEADS_PREVIEW|\/dev\/leads/,
        `${relativePath} must not use the local leads preview`,
      )
      assert.doesNotMatch(source, /send-whatsapp|whatsapp-outbound|meta ads/i)
    }

    const leadsPage = fs.readFileSync(path.join(srcRoot, 'app/app/leads/page.tsx'), 'utf8')
    assert.match(leadsPage, /listInboxItemsForCurrentUser/)
    assert.match(leadsPage, /presentKfzLeadsWorkspace/)

    const dashboardPage = fs.readFileSync(
      path.join(srcRoot, 'features/dashboard/components/dashboard-page-content.tsx'),
      'utf8',
    )
    assert.match(dashboardPage, /countOpenKfzLeads/)
    assert.match(dashboardPage, /openLeadsCount/)

    const dashboardUi = fs.readFileSync(
      path.join(srcRoot, 'features/dashboard/components/agenturzentrale-dashboard.tsx'),
      'utf8',
    )
    assert.match(dashboardUi, /Offene Leads/)
    assert.doesNotMatch(dashboardUi, /Letzte Information/)
    assert.match(dashboardUi, /leadsHref/)

    const nav = fs.readFileSync(path.join(srcRoot, 'components/app/app-navigation.tsx'), 'utf8')
    assert.match(nav, /buildVorgaengeChildNavItems/)

    const navConfig = fs.readFileSync(path.join(srcRoot, 'config/app-navigation.ts'), 'utf8')
    assert.match(navConfig, /LEADS_NAV_HREF/)
    assert.doesNotMatch(navConfig, /\/dev\/leads/)
  })
})
