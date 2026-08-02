import { NextResponse } from 'next/server'

import { processResendInboundWebhook } from '@/features/email/transport/resend/resend-inbound-transport'
import { createServiceRoleInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

/**
 * Inbound-E-Mail-Webhook.
 * Keine Businesslogik — nur Transport → Adapter → Intake.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()

  let store
  try {
    store = createServiceRoleInboundIntakeStore()
  } catch {
    return NextResponse.json(
      { error: 'E-Mail-Inbound ist nicht konfiguriert.' },
      { status: 503 },
    )
  }

  const result = await processResendInboundWebhook({
    rawBody,
    headerId: request.headers.get('svix-id'),
    headerTimestamp: request.headers.get('svix-timestamp'),
    headerSignature: request.headers.get('svix-signature'),
    store,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    deduplicated: result.deduplicated,
    inboxItemId: result.inboxItemId,
  })
}
