/**
 * Telefon-Normalisierung für Kfz-Intake.
 * Führendes `+` bleibt erhalten: +491701234567 → +491701234567.
 */

export function normalizeInternationalPhone(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/[^\d]/g, '')

  if (digits.length < 7 || digits.length > 15) {
    return null
  }

  // Ablehnen wenn außer Ziffern/Leerzeichen/Bindestrichen/Klammern/+ nichts sinnvolles
  if (!/^\+?[\d\s().\/-]+$/.test(trimmed)) {
    return null
  }

  return hasPlus ? `+${digits}` : digits
}
