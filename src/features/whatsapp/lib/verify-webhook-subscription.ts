/**
 * Meta Webhook-Subscription (GET hub.mode / hub.verify_token / hub.challenge).
 */
export function verifyWhatsAppWebhookSubscription(input: {
  mode: string | null
  verifyToken: string | null
  challenge: string | null
  expectedToken: string
}): { ok: true; challenge: string } | { ok: false; status: 403 } {
  const mode = input.mode?.trim() ?? ''
  const token = input.verifyToken?.trim() ?? ''
  const challenge = input.challenge ?? ''

  if (mode !== 'subscribe' || !token || challenge.length === 0) {
    return { ok: false, status: 403 }
  }

  if (token !== input.expectedToken) {
    return { ok: false, status: 403 }
  }

  return { ok: true, challenge }
}
