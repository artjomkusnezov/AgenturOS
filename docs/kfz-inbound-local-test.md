# Kfz Website Intake — Local Test (Gate 2)

Provider-neutraler Landingpage-Intake:

```text
kfz.artkus.de form
  → POST /api/inbound/kfz (Bearer + rate-limit seam)
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
9. Replay/`submissionId` → kein zweites Inbox-Item  
10. UTM/Source normalisiert und in `inbound_metadata.acquisition` behalten  

Zusätzlich: `+491701234567` bleibt `+491701234567`.

## Landingpage-Integrationspunkt (nächster Schritt)

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

## Follow-ups (bewusst nicht Gate 2)

1. **DB CHECK erweitern (Owner-Migration):** `inbox_items.channel` und `source` um `website` ergänzen — ohne Migration schlägt produktives Insert fehl.  
2. **Inbox-Label:** `INBOX_SOURCE_LABELS.website` (z. B. „Website“) in der Inbox-UI.  
3. **Dokumentablage:** sichere Bytes-Pipeline wiederverwenden oder eigenen Seam — Gate 2 speichert nur Upload-Metadaten.  
4. **Retention/Löschung:** Anfrage-/Consent-Nachweise und Metadaten löschbar machen, falls noch nicht vorhanden.  
5. **Rate-Limit Production:** `consumeRateLimit`-Seam durch shared store ersetzen.  
6. **AI:** weiterhin nur über den bestehenden advisory Analysis-Seam; keine kundenwirksame Aktion.

WhatsApp/Meta-Onboarding und PR #14 bleiben unabhängig und blockieren diesen Intake nicht.
