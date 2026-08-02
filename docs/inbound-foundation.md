# AgenturOS – Inbound Foundation (Punkt 36)

Produkt- und Architekturentscheidung. Eingefroren mit Punkt 36C.1.

## Produktprinzip

AgenturOS verarbeitet keine Messenger, keine E-Mails und keine Formulare.  
AgenturOS verarbeitet ausschließlich **eingehende Informationen**.

Jede Quelle wird lediglich über einen Adapter an den gemeinsamen Inbound-Kern angeschlossen.

## Produktbegriff: Quelle

**Quelle** ist ein offizieller Produktbegriff von AgenturOS.

Eine Quelle ist alles, was Informationen in AgenturOS erzeugen kann.

Beispiele:

- Universal Capture
- WhatsApp Business
- Outlook
- Kontaktformular
- Landingpage
- REST API
- Scanner
- Mobile Share
- CSV
- zukünftige Allianz-Schnittstellen
- zukünftige KI-Agenten

Universal Capture ist die Quelle „Mensch im Produkt“ — keine Sonder-Inbox.

## Langfristige Produktsicht (nicht 36C.1)

Quellen werden langfristig im Produkt sichtbar und konfigurierbar sein, sinngemäß:

```text
Einstellungen
  → Quellen
    → WhatsApp
    → Outlook
    → Landingpage
    → …
```

Das ist **kein** Bestandteil von Punkt 36C.1.  
Es ist eine Architektur- und Produktentscheidung, damit spätere Punkte dieselbe Begriffswelt nutzen.

## Architektur

```text
Quelle
  → Adapter
  → InboundItem
  → Intake
  → Inbox
```

| Schicht | Rolle | Neue Quelle ändert … |
|---|---|---|
| Quelle | liefert Information | die Quelle selbst |
| Adapter | mappt auf `InboundItem` | nur den Adapter |
| InboundItem / Intake | kanalneutraler Kern | nichts (höchstens neuer `channel`-Wert) |
| Inbox / Files / Promotion | Arbeit | nichts |

**Stabilitätsregel:** Neue Quellen ausschließlich durch neue Adapter. Inbox, Files, Promotion und Intake-Kern bleiben unverändert.

## Architekturgrundsatz: Adapter ohne Businesslogik

Adapter enthalten **niemals** Businesslogik.

Ein Adapter hat ausschließlich eine Aufgabe: die jeweilige Quelle in einen kanalneutralen `InboundItem` zu übersetzen.

Ein Adapter darf ausdrücklich **nicht**:

- Aufgaben erzeugen
- Vorgänge erzeugen
- Prioritäten vergeben
- KI aufrufen
- Kunden suchen
- Promotion durchführen
- Entscheidungen treffen

Diese Logik gehört ausschließlich in den gemeinsamen Intake-Kern oder spätere Services.

**Produktregel:**

```text
Adapter = Übersetzung
Intake  = Verarbeitung
Inbox   = Arbeit
```

## Architekturgrundsatz: Ursprungsquelle unverändert

AgenturOS verändert **niemals** die Ursprungsquelle.

Eine E-Mail wird nicht beantwortet, verschoben oder in der Quell-Mailbox verändert.  
AgenturOS übernimmt ausschließlich eine **Arbeitskopie** der Information in den eigenen Eingang.

Dasselbe Prinzip gilt für WhatsApp, Formulare, Landingpages, APIs, Scanner und alle weiteren Quellen:

- keine Antwort aus AgenturOS an die Quelle (sofern nicht später bewusst als eigener Produktpunkt)
- keine Steuerung der Quell-App / des Quell-Postfachs
- keine Sync-Zurückschreibung in die Quelle

```text
Quelle bleibt Quelle.
AgenturOS hält eine Arbeitskopie.
```

## Produktentscheidung: konfigurierbare Inbound-Adresse (E-Mail)

Die AgenturOS-Inbound-E-Mail-Adresse ist **nicht** fest verdrahtet.

Produktseitig handelt es sich um eine **konfigurierbare** Inbound-Adresse pro Agency / Quellen-Verbindung.

Für die erste Agentur wird zunächst verwendet:

```text
info@artkus.de
```

Die Architektur bleibt offen für andere Adressen (z. B. später `eingang@…` oder agency-spezifische Adressen).  
Die bestehende Agentur-Fachadresse (z. B. Allianz-Mailbox) bleibt unabhängig.

V1-Workflow:

```text
beliebige E-Mail
  → Weiterleiten an konfigurierte Inbound-Adresse
  → E-Mail-Adapter
  → InboundItem
  → Intake
  → Inbox
```

Kein IMAP, keine Microsoft-Graph-Integration, keine automatische Postfachüberwachung in V1.

## Produktentscheidung: Übermittler vs. Ursprung

Am Inbound-Kern:

- **`sender`** = wer die Information an AgenturOS übermittelt hat (z. B. Weiterleitender)
- **`origin`** = optionaler ursprünglicher Urheber der Information (z. B. Kunde in weitergeleiteter Mail)

Begriff **`origin`** (nicht `originalSender`): kanalneutral für E-Mail, WhatsApp, Formulare, APIs, Scanner usw.  
Shape analog zu `sender` (`displayName`, `address`, `addressKind`).

## Persistenz-Leitplanken

- Eine Inbox: `inbox_items`
- Eine File-Pipeline: `files` / `inbox_item_files`
- Keine Kanaltabellen (`whatsapp_messages`, …)
- Keine zweite Promotion

## Kernvertrag

`InboundItem`: `channel`, `externalId`, `sender`, `receivedAt`, `content`, optional `title` / `origin` / `kind` / `attachments` / `metadata`.

- `title` = optionaler Titel (z. B. E-Mail-Betreff), generisch
- `origin` = optionaler ursprünglicher Urheber (Shape wie `sender`)

## Abgrenzung 36C.1 / 37C

Umgesetzt in 36C.1: Foundation (Vertrag, Intake, additive Persistenz, bestehende Inbox).

Umgesetzt in 37C (Code): `title`/`origin`, providerneutraler E-Mail-Adapter, Resend-Transport, Webhook-Route.

Nicht produktiv aktiviert in 37C: IONOS-Weiterleitung, Resend-Secrets, echte `info@artkus.de`-Verdrahtung.