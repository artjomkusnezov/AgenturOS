import { NextResponse } from 'next/server'

import {
  formatWhatsAppConfigError,
  getWhatsAppVerifyToken,
  listMissingInboundWhatsAppEnvFields,
} from '@/features/whatsapp/config/inbound-whatsapp-config'
import { logWhatsAppInbound } from '@/features/whatsapp/lib/whatsapp-inbound-log'
import { verifyWhatsAppWebhookSubscription } from '@/features/whatsapp/lib/verify-webhook-subscription'
import { processMetaWhatsAppInboundWebhook } from '@/features/whatsapp/transport/meta/meta-whatsapp-inbound-transport'
import { createServiceRoleInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

/**
 * Meta WhatsApp Cloud API Webhook.
 * GET = Subscription-Challenge, POST = Nachrichten/Status → Adapter → Intake.
 * Raw Body wird für HMAC unverändert an den Transport übergeben.
 * Keine Auth-Middleware — Meta muss ungehindert erreichen können.
 */

export async function GET(request: Request) {
  const expectedToken = getWhatsAppVerifyToken()
  if (!expectedToken) {
    logWhatsAppInbound('verify_config_missing', { field: 'WHATSAPP_VERIFY_TOKEN' })
    return new NextResponse('WhatsApp-Verify-Token fehlt.', { status: 503 })
  }

  const url = new URL(request.url)
  const result = verifyWhatsAppWebhookSubscription({
    mode: url.searchParams.get('hub.mode'),
    verifyToken: url.searchParams.get('hub.verify_token'),
    challenge: url.searchParams.get('hub.challenge'),
    expectedToken,
  })

  if (!result.ok) {
    logWhatsAppInbound('verify_rejected', {})
    return new NextResponse('Forbidden', { status: 403 })
  }

  logWhatsAppInbound('verify_ok', {})
  return new NextResponse(result.challenge, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

export async function POST(request: Request) {
  // WICHTIG: exact raw body string — nicht JSON.parse/stringify vor der Signaturprüfung.
  const rawBody = await request.text()

  const missing = listMissingInboundWhatsAppEnvFields()
  if (missing.length > 0) {
    logWhatsAppInbound('config_missing', { fields: missing.join(',') })
    return NextResponse.json(
      { error: formatWhatsAppConfigError(missing) },
      { status: 503 },
    )
  }

  let store
  try {
    store = createServiceRoleInboundIntakeStore()
  } catch {
    logWhatsAppInbound('store_unavailable', {})
    return NextResponse.json(
      { error: 'WhatsApp-Inbound ist nicht konfiguriert (Supabase Service Role).' },
      { status: 503 },
    )
  }

  const result = await processMetaWhatsAppInboundWebhook({
    rawBody,
    signatureHeader: request.headers.get('x-hub-signature-256'),
    store,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    deduplicated: result.deduplicated,
    skippedUnsupported: result.skippedUnsupported,
    statusEvents: result.statusEvents,
    inboxItemIds: result.inboxItemIds,
  })
}
