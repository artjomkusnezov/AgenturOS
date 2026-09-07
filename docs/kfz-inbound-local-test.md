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
Regional für Allianz Kusnezov / Lengerich. Formular baut den Gate-2-`PublicKfzInquiryPayload`, setzt `submissionId` client-seitig und sendet über Server Action in denselben Handler wie `POST /api/inbound/kfz` (Bearer-Secret nur auf dem Server).

Deterministische Landing-Tests: `src/features/inbound/kfz/kfz-landing.smoke.test.ts` (Payload-Mapping, Consent, Submit-Lock, Success/Failure-Phasen, Landing→Intake, Landing→`handleKfzInboundHttpRequest`).

Der HTTP-Handler ist derselbe Einstieg wie `POST /api/inbound/kfz` und die `/kfz` Server Action. Tests dürfen einen Memory-Store injizieren; Production bleibt beim Service-Role-Store. Fehlt die Intake-Konfiguration, antwortet der Handler ehrlich mit `config_missing` (kein Erfolg).

## Inbox-Darstellung (menschliche Prüfung)

Nach Intake erscheint das Item in der bestehenden Inbox (`channel/source=website`), nicht in einer zweiten Lead-Datenbank.

Operator-sichtbar ohne KI:

- Quelle: `Website · Kfz` (plus Acquisition-Source, z. B. `kfz.artkus.de`)
- Kunde, Ort, Kontakt, bevorzugter Kanal, Anliegen, Fahrzeug
- Fehlende Angaben und ein Hinweis zur Dringlichkeit aus den gespeicherten Feldern
- Nächster manueller Schritt — ausdrücklich ohne automatisches Senden oder Anlegen

Die Liste und das Dashboard nutzen den persistierten Titel (`Kfz-Anfrage · Name`), nicht nur den Inhaltstext.

Deterministische Tests: `src/features/inbound/kfz/kfz-inbox-presentation.smoke.test.ts` (Landing-Payload → `handleKfzInboundHttpRequest` → Inbox-Review-Modell).

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
2. **Dokumentablage:** sichere Bytes-Pipeline wiederverwenden oder eigenen Seam — Gate 2 speichert nur Upload-Metadaten.  
3. **Retention/Löschung:** Anfrage-/Consent-Nachweise und Metadaten löschbar machen, falls noch nicht vorhanden.  
4. **Rate-Limit Production:** `consumeRateLimit`-Seam durch shared store ersetzen.  
5. **Domain/Routing:** `kfz.artkus.de` → `/kfz` (oder eigenes Deployment) — Owner/DNS/Vercel, nicht Teil dieses Slices.  
6. **Externe KI-Provider:** optionaler Modell-Host hinter dem bestehenden `InboundAnalysisProvider` — Owner-Entscheidung; Gate 4 nutzt lokale Heuristik + Inbox-`KI-Vorschlag`.

WhatsApp/Meta-Onboarding und PR #14 bleiben unabhängig und blockieren diesen Intake nicht.
