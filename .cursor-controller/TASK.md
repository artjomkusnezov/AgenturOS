# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-792b

## Title
AGENTUROS — REPAIR VERCEL PREVIEW SUPABASE BOOT AND KFZ ROUTES

## Goal
Make the Vercel Preview boot safely and make the public Kfz route verifiable after the owner has configured the existing Supabase/Vercel project, without touching production.

## Confirmed evidence
- Preview deployment builds successfully but GET /app returns 500 with: "Your project's URL and Key are required to create a Supabase client".
- The owner reports the required variables exist and has redeployed.
- GET /kfz and /dev/kfz-landing returned 404 on the tested Preview host.
- The code currently reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY with non-null assertions.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-792b. No merge or main/master write.
- Reproduce the Preview failure locally with missing, legacy and current Supabase env-name combinations.
- Centralize Supabase public configuration validation. Support the existing current name NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and, only if already used by the repository/deployment, a safe legacy NEXT_PUBLIC_SUPABASE_ANON_KEY fallback.
- Never hardcode or print URL/key values. Never expose SUPABASE_SERVICE_ROLE_KEY.
- Prevent /app from crashing with an opaque server error when public Supabase config is absent; render one safe configuration error or redirect to an existing safe sign-in/configuration surface.
- Ensure /kfz is present in the production build and works independently of an authenticated dashboard session. Preserve all six Kfz branches, questionnaire, consent, privacy boundaries and private document-storage behavior.
- Keep /dev/kfz-landing development/test-only if that is the existing contract; do not claim it as the public route.
- Add deterministic regression tests for /app boot configuration and /kfz route presence.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check the new Vercel Preview on desktop and mobile using test data only. Confirm /app no longer throws the opaque Supabase error and /kfz renders. Do not submit real customer data.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy or mutation, secret changes/reads, customer contact, Meta/WhatsApp API, paid services, force push or destructive git.
