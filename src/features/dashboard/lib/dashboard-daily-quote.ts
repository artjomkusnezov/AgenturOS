/**
 * Kuratierte Tagesimpulse für die Agenturzentrale.
 * Deterministisch nach Kalendertag (Europe/Berlin) – kein Random pro Render.
 */

export const DASHBOARD_DAILY_QUOTES = [
  'Klarheit schlägt Hektik.',
  'Was heute sauber wird, belastet morgen nicht.',
  'Gute Arbeit beginnt mit dem nächsten klaren Schritt.',
  'Tempo entsteht durch Fokus.',
  'Ein ruhiger Überblick spart zehn hektische Entscheidungen.',
  'Erst verstehen, dann handeln.',
  'Ordnung im Eingang schafft Ruhe im Tag.',
  'Kleine saubere Schritte tragen weiter als große Absichten.',
  'Wer priorisiert, gewinnt Zeit zurück.',
  'Ruhe ist kein Stillstand – sie ist Steuerung.',
  'Das Wichtige verdient den ersten Blick.',
  'Ein klarer Stand schützt vor falscher Eile.',
  'Qualität zeigt sich in der nächsten Entscheidung.',
  'Weniger parallel, mehr abgeschlossen.',
  'Gute Beratung beginnt mit gutem Überblick.',
  'Heute erledigen, was morgen stören würde.',
  'Fokus ist die freundlichste Form von Geschwindigkeit.',
  'Saubere Übergaben entlasten das ganze Team.',
  'Zuerst den Überblick, dann den nächsten Schritt.',
  'Verlässlichkeit entsteht in den kleinen Routinen.',
  'Nicht alles gleichzeitig – das Richtige jetzt.',
  'Ein ruhiger Start prägt den ganzen Arbeitstag.',
  'Klarheit im Vorgang schützt den Kunden.',
  'Gute Systeme machen gute Arbeit leichter.',
  'Nachvollziehbar arbeiten heißt professionell arbeiten.',
  'Der nächste sinnvolle Schritt genügt.',
  'Überblick vor Aktion – dann sicher handeln.',
  'Sorgfalt heute spart Erklärungen morgen.',
] as const

export type DashboardDailyQuote = (typeof DASHBOARD_DAILY_QUOTES)[number]

/** Kalendertag in Europe/Berlin als YYYY-MM-DD. */
export function getBerlinDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function hashDateKey(key: string): number {
  let hash = 2166136261
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function getDailyQuote(date = new Date()): DashboardDailyQuote {
  const key = getBerlinDateKey(date)
  const index = hashDateKey(key) % DASHBOARD_DAILY_QUOTES.length
  return DASHBOARD_DAILY_QUOTES[index]
}
