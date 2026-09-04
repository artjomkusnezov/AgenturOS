import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Meta X-Hub-Signature-256: sha256=<hex> über RAW request body + App Secret.
 */
export function verifyMetaSignature256(input: {
  rawBody: string
  signatureHeader: string | null
  appSecret: string
}): boolean {
  const header = input.signatureHeader?.trim() ?? ''
  if (!header.startsWith('sha256=')) {
    return false
  }

  const providedHex = header.slice('sha256='.length).trim().toLowerCase()
  if (!/^[0-9a-f]+$/.test(providedHex) || providedHex.length !== 64) {
    return false
  }

  const expectedHex = createHmac('sha256', input.appSecret)
    .update(input.rawBody, 'utf8')
    .digest('hex')

  try {
    const provided = Buffer.from(providedHex, 'hex')
    const expected = Buffer.from(expectedHex, 'hex')
    if (provided.length !== expected.length) {
      return false
    }
    return timingSafeEqual(provided, expected)
  } catch {
    return false
  }
}
