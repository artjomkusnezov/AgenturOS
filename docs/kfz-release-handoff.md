# Kfz release handoff

Kfz-Release-Handoff · Kette und Migrationen, ohne Secrets

Keine Produktionsfreigabe. Dieses Handoff listet Merge-Reihenfolge, Migrationsdateien, Env-Namen, Prüfcommands und Owner-Schritte. Werte, Antworten, Dateinamen von Kunden, Object-Keys und Personenbezüge stehen nicht hier. Merge, Apply, Deploy und Production-Datenbank bleiben Owner.

Branch: `cursor/agenturos-controller-task-ee86` from `cursor/agenturos-controller-task-8bd0` (PR #54).

## 1. Stacked PR dependency (merge-first)

Stack base (no open PR): `cursor/agenturos-controller-task-52f4` @ `3f5cf0e`. Contains Gate-2 plus review/triage history, including website-channel migration `667ac45`.

Parallel open PR #19 (`agent/issue-18` ← master) shares those Gate-2 commits. Do not merge it as a second history.

Merge order (bottom first). This document does not merge:

1. PR #22 `cursor/agenturos-controller-task-3d66` ← `cursor/agenturos-controller-task-52f4` @ `c85589a` — Add manual Kfz response draft workspace
2. PR #24 `cursor/agenturos-controller-task-80f0` ← `cursor/agenturos-controller-task-3d66` @ `5625427` — Add daily Kfz inquiry work queue
3. PR #25 `cursor/agenturos-controller-task-0f60` ← `cursor/agenturos-controller-task-80f0` @ `7ee0203` — Put the daily Kfz queue into the authenticated inbox
4. PR #27 `cursor/agenturos-controller-task-d280` ← `cursor/agenturos-controller-task-0f60` @ `913f133` — Add manual capture source labels for phone, email and notes
5. PR #28 `cursor/agenturos-controller-task-dd22` ← `cursor/agenturos-controller-task-d280` @ `dc1d235` — Warn about likely duplicates before confirming a manual capture
6. PR #29 `cursor/agenturos-controller-task-2ebd` ← `cursor/agenturos-controller-task-dd22` @ `9c716e7` — Turn a manual capture into the existing Kfz review card
7. PR #30 `cursor/agenturos-controller-task-882b` ← `cursor/agenturos-controller-task-2ebd` @ `92b304e` — Unified daily inbox with human source filters
8. PR #31 `cursor/agenturos-controller-task-c268` ← `cursor/agenturos-controller-task-882b` @ `90de96d` — Show factual review history inside each inbound item
9. PR #32 `cursor/agenturos-controller-task-7f68` ← `cursor/agenturos-controller-task-c268` @ `4607e85` — Mobile-first Kfz landing intake with optional documents
10. PR #33 `cursor/agenturos-controller-task-f287` ← `cursor/agenturos-controller-task-7f68` @ `46cb4b8` — Reliable Kfz landing submit and retry
11. PR #34 `cursor/agenturos-controller-task-e134` ← `cursor/agenturos-controller-task-f287` @ `6314c05` — Manual preferred-channel reply handoff for Kfz inquiries
12. PR #35 `cursor/agenturos-controller-task-cc15` ← `cursor/agenturos-controller-task-e134` @ `b7b9fa0` — Add factual unattended-inbound work queue
13. PR #36 `cursor/agenturos-controller-task-c3f6` ← `cursor/agenturos-controller-task-cc15` @ `9f9718e` — Add factual search across the unified inbound queue
14. PR #37 `cursor/agenturos-controller-task-83d4` ← `cursor/agenturos-controller-task-c3f6` @ `94eed48` — Add exact duplicate review on inbound cards
15. PR #38 `cursor/agenturos-controller-task-c467` ← `cursor/agenturos-controller-task-83d4` @ `ae5bf6b` — Port approved Kfz landing redesign onto current inbound flow
16. PR #39 `cursor/agenturos-controller-task-ff2e` ← `cursor/agenturos-controller-task-c467` @ `f2e83a9` — Add full no-document Allianz Kfz question flow for manual review
17. PR #40 `cursor/agenturos-controller-task-e04c` ← `cursor/agenturos-controller-task-ff2e` @ `40e30c4` — Add privacy-safe first-party Kfz funnel analytics
18. PR #41 `cursor/agenturos-controller-task-d2b8` ← `cursor/agenturos-controller-task-e04c` @ `02b6094` — Correct Kfz SF classes and deductible choices
19. PR #42 `cursor/agenturos-controller-task-a5b3` ← `cursor/agenturos-controller-task-d2b8` @ `5e74416` — Add usable privacy-safe Kfz funnel breakdowns
20. PR #44 `cursor/agenturos-controller-task-097a` ← `cursor/agenturos-controller-task-a5b3` @ `f8a996d` — Add internal Kfz launch-readiness checklist
21. PR #45 `cursor/agenturos-controller-task-5cb3` ← `cursor/agenturos-controller-task-097a` @ `b8404a5` — Store Kfz landing documents in a private Supabase bucket
22. PR #46 `cursor/agenturos-controller-task-792b` ← `cursor/agenturos-controller-task-5cb3` @ `5b915fd` — Add secret-safe Kfz Supabase configuration preflight
23. PR #47 `cursor/agenturos-controller-task-9bc0` ← `cursor/agenturos-controller-task-792b` @ `988fbcb` — Repair Vercel Preview Supabase boot and public /kfz route
24. PR #48 `cursor/agenturos-controller-task-75b0` ← `cursor/agenturos-controller-task-9bc0` @ `d5796e0` — Add Kfz release-candidate end-to-end acceptance harness
25. PR #49 `cursor/agenturos-controller-task-32b5` ← `cursor/agenturos-controller-task-75b0` @ `ce68edb` — Improve privacy-safe Kfz funnel analytics review
26. PR #50 `cursor/agenturos-controller-task-9908` ← `cursor/agenturos-controller-task-32b5` @ `58fe486` — Harden Kfz analytics consent and data-quality guardrails
27. PR #51 `cursor/agenturos-controller-task-13c0` ← `cursor/agenturos-controller-task-9908` @ `3579399` — Give the Kfz readiness screen one secret-safe launch answer
28. PR #52 `cursor/agenturos-controller-task-c46d` ← `cursor/agenturos-controller-task-13c0` @ `814b350` — Add privacy-safe Kfz period, source and branch comparisons
29. PR #53 `cursor/agenturos-controller-task-4e4f` ← `cursor/agenturos-controller-task-c46d` @ `b70e5ce` — Harden the privacy-safe Kfz analytics persistence contract
30. PR #54 `cursor/agenturos-controller-task-8bd0` ← `cursor/agenturos-controller-task-4e4f` @ `f4ff667` — Dry-run the complete Kfz Supabase migration chain

## 2. Required migrations (Owner apply only)

Checked-in order equals SQL timestamps. Additive / IF NOT EXISTS / ON CONFLICT. In-memory dry-run is automated. Remote apply is Owner.

1. `supabase/migrations/20260906120000_inbox_website_channel_source.sql` — inbox_items channel/source website. Introducing commit `667ac45` (PR #19). Commit is in this stack history (base 52f4). PR #19 is a parallel open PR on master with the same Gate-2 commits — do not merge it as a second history.
2. `supabase/migrations/20260909140000_kfz_funnel_analytics_events.sql` — kfz_funnel_analytics_events. Introducing commit `55417c6` (PR #40). Stacked PR #40 on this branch.
3. `supabase/migrations/20260910120000_kfz_inbound_documents_bucket.sql` — kfz-inbound-documents private bucket. Introducing commit `3d95a04` (PR #45). Stacked PR #45 on this branch.
4. `supabase/migrations/20260911120000_kfz_funnel_analytics_persistence_contract.sql` — kfz_funnel_analytics_events persistence allow-list and RLS. Introducing commit `b70e5ce` (PR #53). Stacked PR #53 on this branch.

## 3. Environment variable names (no values)

- `INBOUND_KFZ_INTAKE_SECRET` — required
- `INBOUND_KFZ_AGENCY_ID` (fallback `INBOUND_EMAIL_AGENCY_ID`) — required
- `INBOUND_KFZ_ACTOR_USER_ID` (fallback `INBOUND_EMAIL_ACTOR_USER_ID`) — required
- `NEXT_PUBLIC_SUPABASE_URL` — required
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — required
- `SUPABASE_SERVICE_ROLE_KEY` — required
- `INBOUND_KFZ_RATE_LIMIT_MAX` — optional
- `INBOUND_KFZ_RATE_LIMIT_WINDOW_MS` — optional

## 4. Automated / tested commands

- `npm run test:inbound` — automated
- `npx tsc --noEmit` — automated
- `npm run lint` — automated
- `npm run build` — automated
- `npm run preflight:kfz-supabase` — automated

Expected readiness checks (local contract, not production approval):

- `questionnaire`
- `public_configuration`
- `migrations`
- `private_documents`
- `submission_persistence`
- `inbox_item_creation`
- `authorized_review`
- `analytics`

## 5. Owner-only steps (do not perform here)

- merge-stack-in-order: Stacked PRs in merge-first order mergen (#22 → #54). Dieses Handoff merget nichts. PR #19 nicht als zweite Historie mergen.
- vercel-env-values: Im bestehenden Vercel-Projekt die Pflichtnamen setzen. Werte bleiben in Vercel und werden hier nicht angezeigt. Kein NEXT_PUBLIC_ für SUPABASE_SERVICE_ROLE_KEY oder INBOUND_KFZ_INTAKE_SECRET.
- apply-migrations: Im bestehenden Supabase-Projekt die vier SQL-Dateien in Timestamp-Reihenfolge anwenden. Dieser Slice wendet nichts an. Kein neues Projekt, kein DROP.
- confirm-private-bucket: Bucket-Name kfz-inbound-documents: public=false, keine anon/authenticated Policies, kein öffentlicher Link, kein Client-Upload.
- vercel-redeploy: Bestehendes Vercel-Projekt nach Env- und Migrations-Schritten neu deployen. Kein neues Projekt, kein Paid Add-on.
- domain-legal-campaign: Domain-Mapping auf /kfz, Rechtstext/Retention und Kampagne bleiben Owner. Kein Meta/WhatsApp-API, kein automatischer Kundenkontakt.

## 6. Preview checks (read-only)

- local-readiness: Lokal /dev/kfz-readiness: Handoff sichtbar, productionClaim=false, keine Secret-Werte.
- local-landing: Lokal /kfz: sechs Startzweige und Anfrage-Consent. Kein Sofortpreis, kein automatischer Versand.
- local-inbox-review: Lokal /app/inbox und /app/inbox/kfz-document: autorisierte Prüfung, anonym/fremd 401/404. Keine Object-Keys in der UI-Behauptung dieses Handoffs.
- local-analytics: Lokal /app/kfz-analytics oder /dev/kfz-analytics: nur Metadaten (Quelle, Besuch, Zweig, Schritt, Stopp, Timing, Submit).
- vercel-preview-readonly: Vercel Preview nur lesen. SSO-Redirect ist UNKNOWN, kein Production-Beweis. Kein Env-Write, kein Deploy, kein DB-Apply.

## 7. Rollback-safe stop conditions

- out-of-order-merge: Stopp, wenn ein Stack-PR auf die falsche Base gemerged würde.
- checks-failed: Stopp, wenn npm run test:inbound, npx tsc --noEmit, npm run lint oder npm run build fehlschlägt.
- dry-run-failed: Stopp, wenn die In-Memory-Migrationskette nicht ok ist. Kein Remote-Apply.
- public-bucket: Stopp, wenn die Bucket-Migration public=true setzt oder anon/authenticated Policies vergibt.
- missing-env-names: Stopp, wenn preflight:kfz-supabase Pflichtnamen als missing meldet. Werte nicht lesen.
- readiness-blocked: Stopp, wenn /app/kfz-readiness BLOCKED ist.
- apply-error: Stopp beim ersten SQL-Fehler. Restliche Dateien warten. Kein DROP, keine destruktive Down-Migration in diesem Slice.
- parallel-gate2: Stopp, wenn PR #19 unabhängig von diesem Stack auf master gemerged würde (zweite Historie).
- secret-print: Stopp, wenn Secret-Werte, Antworten, Kunden-Dateinamen, Object-Keys oder Personenbezüge ausgegeben würden.

## 8. Preserved surfaces and routes

- six_kfz_branches
- questionnaire
- consent
- analytics
- private_storage
- inbox
- authorized_review

- `/kfz` ← `src/app/kfz/page.tsx`
- `/app/inbox` ← `src/app/app/inbox/page.tsx`
- `/app/inbox/kfz-document` ← `src/app/app/inbox/kfz-document/route.ts`
- `/app/kfz-analytics` ← `src/app/app/kfz-analytics/page.tsx`
- `/app/kfz-readiness` ← `src/app/app/kfz-readiness/page.tsx`
- `/api/inbound/kfz` ← `src/app/api/inbound/kfz/route.ts`
- `/api/inbound/kfz-analytics` ← `src/app/api/inbound/kfz-analytics/route.ts`

Document path: `docs/kfz-release-handoff.md`. Surface: `/app/kfz-readiness` (local preview `/dev/kfz-readiness`).
