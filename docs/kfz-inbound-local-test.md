# Kfz Website Intake — Local Test (Gate 2)

Provider-neutraler Landingpage-Intake:

```text
/kfz (Browser) oder kfz.artkus.de form
  → Server Action / POST /api/inbound/kfz (Bearer + rate-limit seam)
  → public validation
  → domain normalization
  → Kfz adapter → InboundItem (channel=website)
  → Intake → Inbox
```

## Env (lokal)

| Variable | Zweck |
|---|---|
| `INBOUND_KFZ_INTAKE_SECRET` | Shared secret (`Authorization: Bearer …`) |
| `INBOUND_KFZ_AGENCY_ID` | Ziel-Agentur (oder Fallback `INBOUND_EMAIL_AGENCY_ID`) |
| `INBOUND_KFZ_ACTOR_USER_ID` | Audit-Akteur (oder Fallback `INBOUND_EMAIL_ACTOR_USER_ID`) |
| `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` | Persistenz (Service Role Store) |

Optional: `INBOUND_KFZ_RATE_LIMIT_MAX`, `INBOUND_KFZ_RATE_LIMIT_WINDOW_MS`.

## Deterministische Tests (ohne Server)

```bash
npm run test:inbound
```

Die Suite `src/features/inbound/kfz/kfz-intake.smoke.test.ts` deckt u. a. ab:

1. gültige Telefon-Anfrage  
2. gültige E-Mail-Anfrage  
3. beide Kontaktmethoden  
4. fehlende Kontaktmethoden → reject  
5. false/fehlende Consent → reject  
6. malformed E-Mail/Telefon/PLZ → reject  
7. oversized fields/payload → reject  
8. hostile HTML/Script → sicherer Klartext  
9. explizites `submissionId`-Replay → kein zweites Inbox-Item  
9b. identisches Replay ohne `submissionId` → kein Duplikat  
9c. gleiche Person/Kontakt + gleiches Consent, anderes Anliegen → neues Inbox-Item  
10. UTM/Source normalisiert und in `inbound_metadata.acquisition` behalten  

Zusätzlich: `+491701234567` bleibt `+491701234567`.

Datenbank-Vertrag (ohne DB-Apply): `tests/inbound/inbox-website-db-contract.test.ts`
prüft, dass die eingecheckten Migrationen `channel='website'` und `source='website'` erlauben.

## Öffentliche Landingpage (Gate 3 Slice)

**Browser:** `http://localhost:3000/kfz`  
Regionale Landingpage für Allianz Kusnezov / Lengerich (Römer-Hero, Allianz-Logo, Artjom und Vera, Telefon/WhatsApp 05481 9039041, 4,9/48 Google-Bewertungen, FAQ, Impressum/Datenschutz der Agentur). Drei kurze Schritte (Anliegen, Kontakt, optionale Unterlagen + Consent). Formular baut den Gate-2-`PublicKfzInquiryPayload`, setzt `submissionId` client-seitig und sendet über Server Action in denselben Handler wie `POST /api/inbound/kfz` (Bearer-Secret nur auf dem Server).

Standard-Rückkanal ist WhatsApp; Alternativen in dieser Reihenfolge: WhatsApp, Telefon, E-Mail. Gespeichert wird nur die Kundenwahl — keine WhatsApp-/Meta-API, keine Nachricht.

Deterministische Landing-Tests: `src/features/inbound/kfz/kfz-landing.smoke.test.ts`, `src/features/inbound/kfz/kfz-landing-flow.smoke.test.ts` und `src/features/inbound/kfz/kfz-landing-submit.smoke.test.ts` (freigegebenes Landing-Content, Schritte, WhatsApp-Default, Alternativkanal, optionale Dokumentwahl/-validierung, Privacy, Submit→Inbox, Retry/Idempotenz, Draft-Restore ohne Consent/Dateien, kein automatischer Versand).

Der HTTP-Handler ist derselbe Einstieg wie `POST /api/inbound/kfz` und die `/kfz` Server Action. Tests dürfen einen Memory-Store injizieren; Production bleibt beim Service-Role-Store. Fehlt die Intake-Konfiguration, antwortet der Handler ehrlich mit `config_missing` (kein Erfolg).

Submit-Zustände auf der Landingpage (Deutsch): bereit, wird gesendet, angekommen, fehlgeschlagen/erneut versuchen. Dieselbe `submissionId` bleibt bei Timeout, Zurück/Vor und Retry erhalten — der Intake legt kein zweites Inbox-Item an. Nach einem Fehler bleiben Felder und lokale Dateivorschauen stehen; nach einem Neuladen werden Text/Select-Felder aus `sessionStorage` wiederhergestellt, Consent bleibt unchecked, Unterlagen müssen erneut gewählt werden. Nach bestätigtem Erfolg wird der lokale Draft gelöscht. Keine automatische Weiterleitung und keine Nachricht.

Lokale Retry-Vorschau (nicht Production): `http://localhost:3000/dev/kfz-landing` — erster Versand schlägt absichtlich fehl, der Retry geht durch denselben Handler in einen Memory-Store.

## Inbox-Darstellung (menschliche Prüfung)

Nach Intake erscheint das Item in der bestehenden Inbox (`channel/source=website`), nicht in einer zweiten Lead-Datenbank.

Operator-sichtbar ohne KI, in getrennten Blöcken:

- **Kurzfassung** — ein bis zwei Sätze nur aus eingereichten Feldern (kein KI-Text, keine erfundenen Fahrzeug- oder Kontaktdaten)
- **Eingereichte Angaben** — Quelle (`Website · Kfz` plus Acquisition-Source), Kunde, Ort, Kontakt, bevorzugter Kanal, Anliegen, Fahrzeug, Kontext
- **Fehlende Angaben** — Prüfliste mit vorhanden/fehlt (Erreichbarkeit, Kanal-Kontakt, Anliegen, Fahrzeug, Ort/PLZ)
- Hinweis zur Dringlichkeit aus den gespeicherten Feldern
- Nächster manueller Schritt — ausdrücklich ohne automatisches Senden oder Anlegen

Die Inbox-Liste zeigt die Kurzfassung plus „n Angaben fehlen“. Der optionale **KI-Vorschlag · Entwurf** bleibt ein eigener Block darunter.

Deterministische Tests: `src/features/inbound/kfz/kfz-inbox-presentation.smoke.test.ts` und `src/features/inbound/kfz/kfz-review-summary.smoke.test.ts`.

## Manuelle Inbox-Prüfung (bestehende Aktionen)

Im Kfz-Review-Panel bleiben Quelle, Kunde, Anliegen und fehlende Angaben faktisch. Der nächste Schritt ist intern:

- Prüfung starten (interne Notizgrenze, kein neuer Status)
- Interne Notiz am bestehenden Inbox-Inhalt oder interne Folgeaufgabe (`convert-inbox-to-task`)
- Als erledigt markieren nur über `processInboxItem` — nie automatisch nach Intake oder KI-Vorschlag

Keine automatische Kundenantwort, keine Case-/Tarifaktion, kein Versand. KI bleibt als **KI-Vorschlag · Entwurf** getrennt.

Deterministische Tests: `src/features/inbound/kfz/kfz-inbox-manual-triage.smoke.test.ts`.

## Interner Antwortentwurf (manuelle Vorbereitung)

Im Kfz-Inbox-Detail kann die Mitarbeiterin einen **internen Antwortentwurf** zur Anfrage schreiben und ändern. Der Entwurf liegt auf dem bestehenden Inbox-Working-Copy, getrennt vom Quelltext und von internen Notizen.

- KI-Text bleibt als **Vorschlag — menschliche Prüfung erforderlich** sichtbar und kann nur nach Klick als Ausgangstext übernommen werden.
- Speichern schreibt nur den internen Entwurf. Es gibt keinen Senden-Button und keine externe Nebenwirkung.
- Quelle, interne Notizen und Folgeaufgaben bleiben erhalten.

Deterministische Tests: `src/features/inbound/kfz/kfz-response-draft.smoke.test.ts`.

## Kfz-Tagesliste (Inbox / Dashboard / Folgeaufgabe)

Die bestehende Inbox ist die tägliche Kfz-Arbeitsschlange. Filter und Zähler (ohne automatischen Statuswechsel):

- **Neu** (`needs_review`) — frischer vollständiger Eingang, noch keine interne Prüfung
- **Fehlende Angaben** (`missing_information`) — unerledigt, Prüfliste hat Lücken (auch während der Prüfung)
- **In Prüfung** (`in_review`) — interne Notiz / Entwurf / Folgeaufgabe, Angaben vollständig, noch unbearbeitet
- **Erledigt** (`handled`) — manuell über `processInboxItem` geschlossen

Jede Zeile zeigt Kunden-/Anfragefakten, faktische Dringlichkeit falls im Bestand, den Lückenstand und den nächsten manuellen Schritt. Öffnen führt in den bestehenden Prüfschirm (`/app/inbox?item=`).

Der Filter bleibt in der Inbox-URL persistiert: `/app/inbox?phase=missing_information` (optional plus `item=`). Dashboard-Chips und Filter verlinken auf denselben Parameter.

Eine explizit angelegte interne Folgeaufgabe (`convert-inbox-to-task`) erscheint in `/app/tasks?task=…`. Zurück zur Anfrage führt der bestehende Ursprung `cases.source_inbox_item_id` → `/app/inbox?item=…` („Zum Eingang“ / „Zur Anfrage“). Kein automatischer Kundenkontakt.

Deterministische Tests: `src/features/inbound/kfz/kfz-work-queue.smoke.test.ts` (Intake → manuelle Prüfung → Folgeaufgabe sichtbar + Quell-Link).

## Inbox KI-Vorschlag (Gate 4 Slice)

Nach Intake erscheint für Kfz-Website-Items im Inbox-Detail ein interner **KI-Vorschlag · Entwurf** (`src/features/ai-inbound`): Kategorie, Produkt, Dringlichkeit, fehlende Infos, Abschlussimpuls (als Vorschlag), nächster menschlicher Schritt, Antwortentwurf, Human-Takeover-Flag.

- Keine automatische Kundenaktion, kein Case/Task, kein Versand.
- Lokale Heuristik hinter dem bestehenden `InboundAnalysisProvider`-Vertrag; Abschalten: `INBOUND_AI_ANALYSIS_ENABLED=false`.
- Tests: `tests/ai/kfz-ai-proposal.test.ts` (Teil von `npm run test:inbound`).
- Details: `docs/ai-inbound-analysis.md`.

## Landingpage-Integrationspunkt (API)

**URL:** `POST /api/inbound/kfz`  
**Auth:** `Authorization: Bearer <INBOUND_KFZ_INTAKE_SECRET>`  
**Content-Type:** `application/json`

Minimal gültiger Body:

```json
{
  "fullName": "Anna Beispiel",
  "postalCode": "10115",
  "city": "Berlin",
  "phone": "+491701234567",
  "email": null,
  "preferredChannel": "phone",
  "inquiryReason": "Preischeck Kfz-Versicherung",
  "inquiryProcessingConsent": true,
  "consentVersion": "kfz-lp-2026-09-01",
  "consentTimestamp": "2026-09-05T11:59:00.000Z",
  "language": "de",
  "source": "kfz.artkus.de",
  "campaign": "autumn-2026",
  "utmSource": "meta",
  "utmMedium": "paid-social",
  "utmCampaign": "kfz-autumn-2026",
  "submissionId": "stable-client-uuid"
}
```

- Mindestens `phone` oder `email` setzen.  
- `inquiryProcessingConsent` muss exakt `true` sein (Anfragebearbeitung — getrennt von Marketing).  
- `submissionId` für Idempotenz/Replay-Schutz mitsenden.  
- Uploads: nur Metadaten (`uploads[].filename|mimeType|sizeBytes`) — keine Binärdaten in Gate 2.

Fixture: `tests/fixtures/kfz-inquiry-valid.json`.

## Curl (lokaler Dev-Server)

```bash
curl -sS -X POST "http://localhost:3000/api/inbound/kfz" \
  -H "Authorization: Bearer $INBOUND_KFZ_INTAKE_SECRET" \
  -H "Content-Type: application/json" \
  --data @tests/fixtures/kfz-inquiry-valid.json
```

Erwartete Antwort bei Erfolg: `{ "ok": true, "deduplicated": false, "inboxItemId": "…" }`.

## Follow-ups (bewusst nicht in diesem Slice)

1. **Migration anwenden (Owner):** `20260906120000_inbox_website_channel_source.sql` ist eingecheckt; Apply auf Preview/Staging/Production bleibt Owner-Entscheidung.  
2. **Dokumentablage (Blocker):** `/kfz` lässt Desktop-Datei und Mobil-Foto/Galerie zu, prüft Typ/Größe und zeigt lokale Vorschauen. Der Submit trägt nur `uploads[]` (Dateiname, MIME, Größe, Gruppe `fahrzeugschein` | `vorversicherung`). Es gibt keine dauerhafte, authentifizierte Bytes-Ablage in diesem Pfad und keine Secrets-Änderung. Sichere Speicherung bleibt Follow-up (bestehende File-Pipeline braucht Bytes + Auth-Akteur).  
3. **Retention/Löschung:** Anfrage-/Consent-Nachweise und Metadaten löschbar machen, falls noch nicht vorhanden.  
4. **Rate-Limit Production:** `consumeRateLimit`-Seam durch shared store ersetzen.  
5. **Domain/Routing:** `kfz.artkus.de` → `/kfz` (oder eigenes Deployment) — Owner/DNS/Vercel, nicht Teil dieses Slices.  
6. **Externe KI-Provider:** optionaler Modell-Host hinter dem bestehenden `InboundAnalysisProvider` — Owner-Entscheidung; Gate 4 nutzt lokale Heuristik + Inbox-`KI-Vorschlag`.

WhatsApp/Meta-Onboarding und PR #14 bleiben unabhängig und blockieren diesen Intake nicht.
