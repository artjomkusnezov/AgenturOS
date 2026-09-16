# Kfz production-readiness acceptance

Release-candidate note for the Kfz path after the Leads workspace (PR #65). Not a production approval. This branch does not merge, deploy, apply migrations, or read secret values.

Branch: `cursor/agenturos-controller-task-9aa2` onto `cursor/agenturos-controller-task-eeba`.

## Green on this branch (code / local harness)

- Public `/kfz` six start branches, questionnaire completeness, consent gate, retry, exact-once `submissionId`.
- Persist contract: one website inbox working copy per submission; no parallel CRM/lead table.
- Employee path: `/app/inbox` and `/app/leads` show the same item. Status Neu → Kontaktiert → Termin/Angebot → Gewonnen / Verloren lives on the existing inbox copy. Won/lost set `processed_at`; open statuses reopen it.
- Offene-Leads KPI on `/app` and Leads nav badge use `countOpenKfzLeads` (not won/lost). KPI and badge link to `/app/leads`.
- Documents only via authorized `/app/inbox/kfz-document`. Anonymous 401, cross-item 404. No public object URL.
- Explicit Übernahme as Aufgabe / Angebot / Schaden stays the existing promotion menu. No silent Vorgang.
- First-party funnel analytics: allow-list + redaction. No answers, contact, filename, object key, or other PII in events, dashboard, or decision CSV. No Meta/WhatsApp API, no pixel secrets, no auto-reply.
- Deterministic suite: `kfz-release-candidate-acceptance` walks `/kfz` → submit → inbox → Leads → status → document auth → analytics privacy.

## Owner / deploy only (not done here)

- Merge this PR, then the stack onto `master`.
- Apply checked-in migrations in timestamp order (do not apply from this agent).
- Set Production + Preview env names (values never read or printed here).
- Map `kfz.artkus.de` → `/kfz` if that is still the intended public host.
- One synthetic production smoke after deploy (below). Domain, legal text, retention, and campaign remain Owner.

## Required migrations (checked in, remote pending)

1. `supabase/migrations/20260906120000_inbox_website_channel_source.sql`
2. `supabase/migrations/20260909140000_kfz_funnel_analytics_events.sql`
3. `supabase/migrations/20260910120000_kfz_inbound_documents_bucket.sql`
4. `supabase/migrations/20260911120000_kfz_funnel_analytics_persistence_contract.sql`

No additive Leads migration. Lead status uses operator notes + `processed_at` on `inbox_items`.

## Env names (no values)

Required Production + Preview:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` (server only, never `NEXT_PUBLIC_`)
- `INBOUND_KFZ_INTAKE_SECRET` (server only, never `NEXT_PUBLIC_`)
- `INBOUND_KFZ_AGENCY_ID` (fallback `INBOUND_EMAIL_AGENCY_ID`)
- `INBOUND_KFZ_ACTOR_USER_ID` (fallback `INBOUND_EMAIL_ACTOR_USER_ID`)
- `NEXT_PUBLIC_SITE_URL`

Optional: `INBOUND_KFZ_RATE_LIMIT_MAX`, `INBOUND_KFZ_RATE_LIMIT_WINDOW_MS`, `INBOUND_AI_ANALYSIS_ENABLED`.

Verify present/missing only: `npm run preflight:kfz-supabase`.

## Production smoke (Owner, after config)

1. Open `https://kfz.artkus.de/kfz?utm_source=google&utm_campaign=kfz-check` (or the live `/kfz` host).
2. Walk all six starts. Submit one questionnaire or upload path with consent.
3. Confirmation once. Retry same `submissionId` must not duplicate.
4. Sign in → `/app` Offene Leads count increments and links to `/app/leads`.
5. `/app/leads` shows the item. Set Kontaktiert, then Termin/Angebot. Count stays open. No Vorgang appears.
6. `/app/inbox?item=…` is the same working copy. Document only via `/app/inbox/kfz-document`.
7. `/app/kfz-analytics` shows aggregate source/branch/funnel only — no answers, names, phones, emails, filenames.
8. Optional explicit Übernahme as Aufgabe or Angebot. Never automatic.

`/dev/*` surfaces are not launch proof.

## Out of scope / not activated

Merge, auto-merge, production deploy, production DB writes, secrets inspection, Meta CAPI/Pixel, WhatsApp send, auto-replies, paid analytics, CRM duplication, RLS weakening.
