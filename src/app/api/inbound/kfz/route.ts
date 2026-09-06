import { NextResponse } from 'next/server'

import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'

/**
 * Kfz Landingpage Intake (Gate 2).
 * Authenticated / abuse-resistant → validate → normalize → InboundItem → Inbox.
 * Öffentliche UI: `/kfz` (Server Action nutzt denselben HTTP-Handler).
 * Keine Businesslogik in der Route.
 */
export async function POST(request: Request) {
  const result = await handleKfzInboundHttpRequest(request)

  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status })
  }

  return NextResponse.json(result.body)
}
