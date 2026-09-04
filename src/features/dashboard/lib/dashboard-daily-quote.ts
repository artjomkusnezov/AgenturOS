/**
 * Kuratierte Tageszitate für die Agenturzentrale.
 * Kurze, seriöse Zitate mit bekannten Zuschreibungen.
 * Deterministisch nach Kalendertag (Europe/Berlin) – kein Random pro Render,
 * kein API, keine KI.
 */

export type DashboardDailyQuote = {
  text: string
  author: string
}

export const DASHBOARD_DAILY_QUOTES: readonly DashboardDailyQuote[] = [
  {
    text: 'Die beste Zeit, einen Baum zu pflanzen, war vor zwanzig Jahren. Die zweitbeste Zeit ist jetzt.',
    author: 'Chinesisches Sprichwort',
  },
  {
    text: 'Es ist nicht genug zu wissen, man muss auch anwenden; es ist nicht genug zu wollen, man muss auch tun.',
    author: 'Johann Wolfgang von Goethe',
  },
  {
    text: 'Wer kämpft, kann verlieren. Wer nicht kämpft, hat schon verloren.',
    author: 'Bertolt Brecht',
  },
  {
    text: 'Mut steht am Anfang des Handelns, Glück am Ende.',
    author: 'Demokrit',
  },
  {
    text: 'In der Ruhe liegt die Kraft.',
    author: 'Deutsches Sprichwort',
  },
  {
    text: 'Was du heute kannst besorgen, das verschiebe nicht auf morgen.',
    author: 'Deutsches Sprichwort',
  },
  {
    text: 'Der Anfang ist die Hälfte des Ganzen.',
    author: 'Aristoteles',
  },
  {
    text: 'Wer den Hafen nicht kennt, in den er segeln will, für den ist kein Wind der richtige.',
    author: 'Seneca',
  },
  {
    text: 'Nicht weil es schwer ist, wagen wir es nicht, sondern weil wir es nicht wagen, ist es schwer.',
    author: 'Seneca',
  },
  {
    text: 'Charakter ist Schicksal.',
    author: 'Heraklit',
  },
  {
    text: 'Geduld ist bitter, aber ihre Frucht ist süß.',
    author: 'Jean-Jacques Rousseau',
  },
  {
    text: 'Wer aufhört, besser zu werden, hat aufgehört, gut zu sein.',
    author: 'Philip Rosenthal',
  },
  {
    text: 'Erfolg ist die Fähigkeit, von einem Misserfolg zum nächsten zu gehen, ohne die Begeisterung zu verlieren.',
    author: 'Winston Churchill',
  },
  {
    text: 'Tu das, was du kannst, mit dem, was du hast, dort, wo du bist.',
    author: 'Theodore Roosevelt',
  },
  {
    text: 'Einfachheit ist die höchste Form der Raffinesse.',
    author: 'Leonardo da Vinci',
  },
  {
    text: 'Wer immer tut, was er schon kann, bleibt immer das, was er schon ist.',
    author: 'Henry Ford',
  },
  {
    text: 'Ohne Hast, aber ohne Rast.',
    author: 'Johann Wolfgang von Goethe',
  },
  {
    text: 'Nur was wir teilen, besitzen wir wirklich.',
    author: 'Seneca',
  },
  {
    text: 'Vorsicht ist die Mutter der Weisheit.',
    author: 'Deutsches Sprichwort',
  },
  {
    text: 'Erst denken, dann handeln.',
    author: 'Deutsches Sprichwort',
  },
  {
    text: 'Ein Weiser ändert seine Meinung, ein Narr nie.',
    author: 'Deutsches Sprichwort',
  },
  {
    text: 'Disziplin ist die Brücke zwischen Zielen und Erfüllung.',
    author: 'Jim Rohn',
  },
  {
    text: 'Handle stets so, dass die Maxime deines Willens zugleich als Prinzip einer allgemeinen Gesetzgebung gelten könne.',
    author: 'Immanuel Kant',
  },
  {
    text: 'Auch der weiteste Weg beginnt mit dem ersten Schritt.',
    author: 'Laozi',
  },
] as const

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
