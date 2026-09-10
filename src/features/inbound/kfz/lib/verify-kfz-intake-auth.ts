import { timingSafeEqual } from 'node:crypto'

/**
 * Bearer-Token-Prüfung für den öffentlichen Kfz-Intake.
 * Kein Logging von Token-Werten.
 */
export function verifyKfzIntakeBearer(input: {
  authorizationHeader: string | null
  expectedSecret: string
}): boolean {
  const header = input.authorizationHeader?.trim() ?? ''
  if (!header.toLowerCase().startsWith('bearer ')) {
    return false
  }

  const provided = header.slice('bearer '.length).trim()
  const expected = input.expectedSecret

  if (!provided || !expected) {
    return false
  }

  const providedBuf = Buffer.from(provided, 'utf8')
  const expectedBuf = Buffer.from(expected, 'utf8')

  if (providedBuf.length !== expectedBuf.length) {
    return false
  }

  try {
    return timingSafeEqual(providedBuf, expectedBuf)
  } catch {
    return false
  }
}
