# WhatsApp Inbound — Live E2E Vorbereitung (39B)

Callback-URL (Production):

`https://app.artkus.de/api/inbound/whatsapp`

## Production Env (Vercel / Hosting) — Pflicht

| Variable | Zweck |
|---|---|
| `WHATSAPP_VERIFY_TOKEN` | Meta GET Challenge |
| `WHATSAPP_ACCESS_TOKEN` | Graph Media Download (temporärer Test-Token OK) |
| `META_APP_SECRET` | HMAC `X-Hub-Signature-256` |
| `INBOUND_WHATSAPP_AGENCY_ID` | Ziel-Agentur |
| `INBOUND_WHATSAPP_ACTOR_USER_ID` | Aktives Agenturmitglied (Audit) |
| `WHATSAPP_PHONE_NUMBER_ID` | Ops/Dokumentation (Testnummer-ID) — **kein Empfangsfilter** |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Ops/Dokumentation (Test-WABA) — **kein Empfangsfilter** |

Optional: `WHATSAPP_GRAPH_API_VERSION` (Default `v21.0`).

**Niemals in Production:** `WHATSAPP_SKIP_SIGNATURE_VERIFY=true` (wird in Production ignoriert / Config verlangt Secret).

Zusätzlich wie bisher: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## META E2E STEPS (AgenturOS / Testnummer)

### META STEP 1
Meta Developer → App **AgenturOS** → **WhatsApp** → **Configuration** (Webhook).

### META STEP 2
Callback URL:

`https://app.artkus.de/api/inbound/whatsapp`

### META STEP 3
Verify Token = exakt der Wert von `WHATSAPP_VERIFY_TOKEN` in Production Env.  
„Verify and save“ — Meta sendet GET; AgenturOS antwortet mit `hub.challenge`.

### META STEP 4
Webhook fields abonnieren: mindestens **`messages`**.  
(Statuses dürfen ankommen; erzeugen keinen Eingang.)

### META STEP 5
Unter **API Setup / To** einen **Testempfänger** (eigene Handynummer) hinzufügen und den Meta-Code bestätigen.

### META STEP 6
Von diesem Handy an die **Meta-Testnummer** senden, nacheinander:
1. reine Textnachricht
2. Sprachnachricht
3. Foto (optional mit Caption)
4. PDF

### META STEP 7
In AgenturOS unter **Eingang** prüfen:
- Quelle **WhatsApp** (Icon/Label)
- Absendername oder Telefon
- Textinhalt bzw. Caption
- Anhänge über bestehenden Viewer (Audio/Bild/PDF)
- erneut gesendete gleiche Nachricht → kein zweiter Eintrag (Dedup)

## Lokaler Fixture-Test (ohne Meta)

Nur Development: `WHATSAPP_SKIP_SIGNATURE_VERIFY=true`  
Dann POST Fixture gegen lokalen Server — siehe frühere 39A-Hinweise.

## Verbote

Keine produktive Nummer (`+49 5481 …9041`), keine Coexistence, kein Outbound, keine Migration.
