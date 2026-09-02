export type DailyQuote = {
  text: string
  author: string
}

/** Curated agency-oriented quotes — rotates deterministically by calendar day (Europe/Berlin). */
export const DASHBOARD_DAILY_QUOTES: readonly DailyQuote[] = [
  {
    text: 'Vertrauen entsteht durch Konsequenz — jeden Tag, in jeder Beratung.',
    author: 'Agentur-Leitbild',
  },
  {
    text: 'Der beste Schutz ist der, den der Kunde versteht.',
    author: 'Versicherungsweisheit',
  },
  {
    text: 'Ordnung im Vorgang schafft Ruhe im Kopf.',
    author: 'AgenturOS',
  },
  {
    text: 'Wer zuhört, berät besser als wer nur verkauft.',
    author: 'Beratungspraxis',
  },
  {
    text: 'Klarheit vor Geschwindigkeit — aber beides, wenn möglich.',
    author: 'Agentur-Leitbild',
  },
  {
    text: 'Jede Information ist der Anfang eines guten Vorgangs.',
    author: 'AgenturOS',
  },
  {
    text: 'Teamarbeit bedeutet: Niemand arbeitet allein an einem offenen Punkt.',
    author: 'Agentur-Kultur',
  },
  {
    text: 'Heute die Kleinigkeiten erledigen — morgen die großen Entscheidungen.',
    author: 'Tagesrhythmus',
  },
  {
    text: 'Gute Vorbereitung ist die halbe Beratung.',
    author: 'Versicherungsweisheit',
  },
  {
    text: 'Transparenz schafft Vertrauen — auch intern.',
    author: 'Agentur-Leitbild',
  },
  {
    text: 'Der Kunde merkt, ob wir wirklich da sind.',
    author: 'Service-Mentalität',
  },
  {
    text: 'Struktur ist kein Gegenteil von Flexibilität — sie macht sie möglich.',
    author: 'AgenturOS',
  },
] as const

function getBerlinDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Simple deterministic hash for a date string → stable index into the quote list. */
function hashDateKey(dateKey: string): number {
  let hash = 0
  for (let index = 0; index < dateKey.length; index += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(index)) >>> 0
  }
  return hash
}

export function getDailyQuote(date = new Date()): DailyQuote {
  const dateKey = getBerlinDateKey(date)
  const index = hashDateKey(dateKey) % DASHBOARD_DAILY_QUOTES.length
  return DASHBOARD_DAILY_QUOTES[index]!
}
