import type { Metadata } from 'next'
import Link from 'next/link'

import {
  LegalPageShell,
  LegalSection,
  OwnerInputNote,
} from '@/components/legal/legal-page-shell'

export const metadata: Metadata = {
  title: 'Datenlöschung | AgenturOS',
  description:
    'Anleitung zur Anfrage auf Löschung personenbezogener Daten, die über AgenturOS bzw. WhatsApp verarbeitet wurden.',
  robots: {
    index: true,
    follow: true,
  },
}

/**
 * Öffentliche Anleitung zur Datenlöschungsanfrage (ohne Login).
 */
export default function DatenloeschungPage() {
  return (
    <LegalPageShell
      title="Datenlöschung"
      description="So können Sie die Löschung Ihrer über AgenturOS – einschließlich eingehender WhatsApp-Kommunikation – verarbeiteten personenbezogenen Daten anfragen."
    >
      <LegalSection title="1. Kurz erklärt">
        <p>
          AgenturOS speichert eingehende Informationen als Arbeitskopie für die Agentur. Eine
          vollautomatische Löschung durch Endkunden ist derzeit nicht in der Anwendung
          eingebaut. Löschanfragen werden über den angegebenen Kontakt entgegengenommen und
          bearbeitet.
        </p>
      </LegalSection>

      <LegalSection title="2. So stellen Sie eine Anfrage">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Senden Sie eine E-Mail an{' '}
            <a
              href="mailto:info@artkus.de?subject=Datenl%C3%B6schung%20AgenturOS"
              className="text-sky-300 underline-offset-2 hover:underline"
            >
              info@artkus.de
            </a>{' '}
            mit dem Betreff „Datenlöschung AgenturOS“.
          </li>
          <li>
            Nennen Sie möglichst genau, worauf sich die Anfrage bezieht (z. B. WhatsApp-Nummer,
            Zeitraum, ungefähre Nachrichteninhalte oder andere Identifizierungsmerkmale).
          </li>
          <li>
            Geben Sie an, ob Sie die Löschung sämtlicher bekannter Daten wünschen oder nur
            bestimmter Vorgänge/Nachrichten.
          </li>
          <li>
            Wir prüfen die Anfrage und setzen uns über die von Ihnen genutzte Kontaktadresse
            zurück.
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="3. Was wir typischerweise benötigen">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Ihre WhatsApp-/Telefonnummer, falls die Anfrage WhatsApp betrifft</li>
          <li>Name oder Anzeigename, soweit bekannt</li>
          <li>Zeitraum der Kommunikation</li>
          <li>optional: weitere Hinweise zur Zuordnung (ohne Passwörter oder Zugangsdaten)</li>
        </ul>
        <p>
          Bitte senden Sie keine unnötigen Ausweisdokumente unaufgefordert. Falls zur
          Identitätsprüfung Unterlagen nötig sind, werden wir das gesondert mitteilen.
        </p>
      </LegalSection>

      <LegalSection title="4. Hinweise">
        <p>
          Technische Status-Ereignisse von Meta (z. B. „zugestellt“) erzeugen in AgenturOS keinen
          eigenen Eingangseintrag. Für Löschungen bei Meta selbst gelten zusätzlich die
          Einstellungen und Prozesse von WhatsApp / Meta.
        </p>
        <p>
          Weitere Informationen zur Verarbeitung finden Sie unter{' '}
          <Link href="/datenschutz" className="text-sky-300 underline-offset-2 hover:underline">
            Datenschutz
          </Link>
          .
        </p>
        <OwnerInputNote>
          <p>
            Bitte ergänzen: interne Bearbeitungsfrist für Löschanfragen und etwaige gesetzliche
            Aufbewahrungspflichten, die einer sofortigen vollständigen Löschung entgegenstehen
            können.
          </p>
        </OwnerInputNote>
      </LegalSection>
    </LegalPageShell>
  )
}
