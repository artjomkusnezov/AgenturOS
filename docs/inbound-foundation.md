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

## Persistenz-Leitplanken

- Eine Inbox: `inbox_items`
- Eine File-Pipeline: `files` / `inbox_item_files`
- Keine Kanaltabellen (`whatsapp_messages`, …)
- Keine zweite Promotion

## Kernvertrag

`InboundItem`: `channel`, `externalId`, `sender`, `receivedAt`, `content`, optional `kind` / `attachments` / `metadata`.

## Abgrenzung 36C.1

Umgesetzt in 36C.1: Foundation (Vertrag, Intake, additive Persistenz, bestehende Inbox).

Nicht in 36C.1: WhatsApp-/Outlook-Adapter, Webhooks, externe APIs, UI „Einstellungen → Quellen“.
