import type { Metadata } from 'next'

import {
  LegalPageShell,
  LegalSection,
  OwnerInputNote,
} from '@/components/legal/legal-page-shell'

export const metadata: Metadata = {
  title: 'Datenschutz | AgenturOS',
  description:
    'Datenschutzhinweise zu AgenturOS, Hosting, Supabase und der WhatsApp Business Platform / Meta.',
  robots: {
    index: true,
    follow: true,
  },
}

/**
 * Öffentliche Datenschutzseite (ohne Login) — Voraussetzung Meta App Publishing.
 * Enthält nur aus dem Projekt ableitbare Angaben; Unsicherheiten als OWNER INPUT.
 */
export default function DatenschutzPage() {
  return (
    <LegalPageShell
      title="Datenschutz"
      description="Informationen zur Verarbeitung personenbezogener Daten in AgenturOS, insbesondere im Zusammenhang mit eingehenden Nachrichten über die WhatsApp Business Platform (Meta)."
    >
      <LegalSection title="1. Verantwortlicher">
        <p>
          AgenturOS wird unter der Marke <strong className="font-medium text-slate-100">Allianz Kusnezov</strong>{' '}
          betrieben (sichtbarer Markenauftritt in der Anwendung). Die technische Anwendung ist unter{' '}
          <strong className="font-medium text-slate-100">app.artkus.de</strong> erreichbar.
        </p>
        <p>
          Kontakt für Anfragen:{' '}
          <a
            href="mailto:info@artkus.de"
            className="text-sky-300 underline-offset-2 hover:underline"
          >
            info@artkus.de
          </a>
        </p>
        <OwnerInputNote>
          <p>
            Bitte ergänzen: vollständige rechtliche Bezeichnung des Verantwortlichen (z. B. Rechtsform),
            ladungsfähige Anschrift, Vertretungsberechtigte sowie – falls vorhanden – Angaben zu
            Handelsregister und Datenschutzbeauftragtem.
          </p>
        </OwnerInputNote>
      </LegalSection>

      <LegalSection title="2. Was ist AgenturOS?">
        <p>
          AgenturOS ist die digitale Arbeitsschicht einer Versicherungsagentur. Das System nimmt
          eingehende Informationen entgegen (z. B. aus dem Eingang), speichert eine Arbeitskopie und
          unterstützt die Bearbeitung durch die Agentur. AgenturOS ist kein CRM und keine zweite
          Kundendatenbank; Quellsysteme bleiben unberührt.
        </p>
      </LegalSection>

      <LegalSection title="3. Allgemeine Verarbeitung in AgenturOS">
        <p>Im Rahmen der Nutzung können insbesondere verarbeitet werden:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Inhalte aus dem Eingang (z. B. Textnachrichten, Anhänge)</li>
          <li>Metadaten wie Empfangszeitpunkt und technische Kennungen der Nachricht</li>
          <li>Angaben zu Absendern, soweit sie mit der Nachricht übermittelt werden</li>
          <li>Arbeitsbezogene Daten innerhalb der Agentur (z. B. Vorgänge, Aufgaben, Dateien), die Nutzer der Agentur anlegen oder verknüpfen</li>
          <li>Kontodaten angemeldeter Agenturmitglieder (Authentifizierung)</li>
        </ul>
        <p>
          Zweck ist die Unterstützung der Agenturarbeit und der Bearbeitung der Kundenkommunikation
          innerhalb AgenturOS.
        </p>
      </LegalSection>

      <LegalSection title="4. Hosting">
        <p>
          Die Anwendung AgenturOS wird produktiv unter der Domain <strong className="font-medium text-slate-100">app.artkus.de</strong>{' '}
          betrieben. Das Deployment erfolgt über die Hosting-Plattform <strong className="font-medium text-slate-100">Vercel</strong>.
        </p>
        <OwnerInputNote>
          <p>
            Bitte bestätigen/ergänzen: vertragliche Rolle von Vercel (Auftragsverarbeitung),
            Verarbeitungsort/Region sowie Verweis auf die aktuelle Vercel-Datenschutzerklärung, falls
            gewünscht.
          </p>
        </OwnerInputNote>
      </LegalSection>

      <LegalSection title="5. Supabase">
        <p>
          AgenturOS nutzt <strong className="font-medium text-slate-100">Supabase</strong> für
          Authentifizierung, Datenbank und Dateispeicher (u. a. Anhänge). Dadurch können
          personenbezogene Daten und Dateiinhalte bei Supabase gespeichert und verarbeitet werden.
        </p>
        <OwnerInputNote>
          <p>
            Bitte ergänzen: konkrete Supabase-Projektregion, Auftragsverarbeitungsvertrag und – falls
            relevant – Unterauftragsverarbeiter, soweit sie nicht bereits in den Standardunterlagen von
            Supabase abgebildet sind.
          </p>
        </OwnerInputNote>
      </LegalSection>

      <LegalSection title="6. WhatsApp Business Platform / Meta">
        <p>
          Für eingehende WhatsApp-Kommunikation ist die Meta WhatsApp Business Platform angebunden.
          Meta übermittelt Webhooks an AgenturOS (Endpoint unter{' '}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-[0.85em] text-slate-100">
            app.artkus.de/api/inbound/whatsapp
          </code>
          ). AgenturOS prüft die Webhook-Verifizierung und die Signatur der Anfragen und übernimmt
          gültige Nachrichten in den Eingang.
        </p>
        <p>Im Zusammenhang mit WhatsApp können insbesondere folgende Daten verarbeitet werden:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Telefonnummer des Absenders</li>
          <li>Anzeigename (soweit von Meta bereitgestellt)</li>
          <li>Nachrichteninhalt (z. B. Text)</li>
          <li>Zeitstempel</li>
          <li>technische Nachrichten-ID (z. B. zur Duplikatsvermeidung)</li>
          <li>Anhänge wie Audio-/Sprachnachrichten, Bilder und Dokumente/PDFs einschließlich zugehöriger Metadaten (z. B. Dateiname, MIME-Typ, Caption), soweit übermittelt</li>
          <li>optionaler Bezug zu einer vorherigen Nachricht (Reply-/Context-ID), soweit übermittelt</li>
        </ul>
        <p>
          Zweck: Bearbeitung der Kundenkommunikation innerhalb AgenturOS durch die Agentur.
          Status-Ereignisse von Meta (z. B. Zustellstatus) werden technisch entgegengenommen, erzeugen
          aber keinen eigenen Eingangseintrag.
        </p>
        <p>
          Die Nutzung von WhatsApp unterliegt zusätzlich den Bedingungen und Datenschutzhinweisen von
          Meta Platforms. AgenturOS speichert keine Meta Access Tokens oder App Secrets in der
          Benutzeroberfläche.
        </p>
      </LegalSection>

      <LegalSection title="7. Speicherung und Löschung">
        <p>
          Eingehende Informationen werden als Arbeitskopie in AgenturOS gespeichert und können mit
          Dateianhängen im Dateispeicher verknüpft werden. Eine automatisierte
          Self-Service-Löschung für Endkunden ist in AgenturOS derzeit nicht vorgesehen.
        </p>
        <p>
          Anfragen zur Löschung personenbezogener Daten können über die Seite{' '}
          <a href="/datenloeschung" className="text-sky-300 underline-offset-2 hover:underline">
            Datenlöschung
          </a>{' '}
          bzw. per E-Mail an{' '}
          <a
            href="mailto:info@artkus.de"
            className="text-sky-300 underline-offset-2 hover:underline"
          >
            info@artkus.de
          </a>{' '}
          gestellt werden.
        </p>
        <OwnerInputNote>
          <p>
            Bitte ergänzen: konkrete Aufbewahrungsfristen, interne Löschprozesse und – soweit
            einschlägig – gesetzliche Aufbewahrungspflichten der Versicherungsagentur. Keine
            Fristen wurden hier erfunden.
          </p>
        </OwnerInputNote>
      </LegalSection>

      <LegalSection title="8. Betroffenenrechte">
        <p>
          Betroffene Personen können unbeschadet anderer Rechte insbesondere Auskunft,
          Berichtigung, Löschung, Einschränkung der Verarbeitung sowie Widerspruch geltend machen,
          soweit die gesetzlichen Voraussetzungen vorliegen. Anfragen richten Sie bitte an{' '}
          <a
            href="mailto:info@artkus.de"
            className="text-sky-300 underline-offset-2 hover:underline"
          >
            info@artkus.de
          </a>
          .
        </p>
        <OwnerInputNote>
          <p>
            Bitte ergänzen: zuständige Aufsichtsbehörde und – falls gewünscht – ausdrückliche
            Rechtsgrundlagen (z. B. Vertrag, berechtigtes Interesse) je Verarbeitungszweck, sobald
            rechtlich freigegeben.
          </p>
        </OwnerInputNote>
      </LegalSection>

      <LegalSection title="9. Kontakt">
        <p>
          Datenschutz und Datenlöschung:{' '}
          <a
            href="mailto:info@artkus.de"
            className="text-sky-300 underline-offset-2 hover:underline"
          >
            info@artkus.de
          </a>
        </p>
        <p>
          Kurz-Anleitung zur Löschanfrage:{' '}
          <a href="/datenloeschung" className="text-sky-300 underline-offset-2 hover:underline">
            /datenloeschung
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
