# Cursor Cloud Controller Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-eeba

## Title
AGENTUROS — KFZ PRODUCTION-READINESS ACCEPTANCE + LEAD FLOW V1

## Priority
P0. Close the remaining safe pre-launch gaps in the Kfz chain after PR #65. No unrelated AgenturOS work.

## Goal
Prove and harden one coherent Kfz path from public questionnaire submission through persisted inbox/Lead visibility and employee handling, while preserving privacy-safe analytics. This task prepares a reviewable release candidate only; it must not deploy or mutate production.

## Required work

### K1 — End-to-end acceptance harness
Using synthetic/local or preview-safe data, exercise public /kfz questionnaire → submit → existing persistence contract → Eingang/Leads → lead detail → explicit employee status handling. Reuse the existing Kfz and inbox storage; no parallel CRM/database.

### K2 — Leads integration hardening
Validate PR #65 against real application navigation and existing inbox/case workflows. Fix only deterministic integration defects: Offene Leads count/links, status persistence, document authorization path, responsive navigation, and explicit handoff to existing Vorgang/task/offer actions where already supported. Never silently create a Vorgang.

### K3 — Privacy-safe funnel analytics acceptance
Verify existing source/UTM/first-touch and funnel analytics remain aggregate/privacy-safe and contain no questionnaire answers, contact details, document metadata that identifies a person, or other PII. Reuse existing analytics implementation; do not add Meta API, pixels requiring secrets, WhatsApp, auto-replies or a new paid service.

### K4 — Release checklist
Produce a concise branch-local release/acceptance note identifying exactly what is green, what remains owner/deploy-only, required migrations/env names without values, and a production smoke checklist. Do not inspect or change secrets and do not apply migrations.

## Browser proof
Fresh desktop and about 390x844 proof must cover public Kfz entry/questionnaire, successful synthetic submission path where local/preview environment supports it, Leads navigation/KPI/list/detail/status persistence, authorized document behavior, Eingang compatibility, and privacy-safe analytics view where available. If an environment dependency prevents a step, report it truthfully instead of faking success.

## Tests / quality
Run at minimum npm run test:inbound, npx tsc --noEmit, npm run lint, npm run build, plus deterministic acceptance tests for the end-to-end Kfz→Lead chain and analytics privacy invariants. Report exact totals/results. Maximum two repair attempts for the same failure.

## Hard boundaries
No merge/auto-merge, production deploy, production DB/data mutation, main/master write, secrets, paid services, Meta/WhatsApp API, auto-replies, unrelated AgenturOS features, CRM duplication or weakened RLS/private storage/privacy controls.

## Deliverable
One Cursor-created branch and PR based on cursor/agenturos-controller-task-eeba with only production-readiness/acceptance fixes, exact QA results, fresh desktop/mobile browser evidence and a release checklist.

## Definition of done
The Kfz chain is a reviewable release candidate: synthetic public intake reaches the existing persisted lead workflow, employees can find/work it through Leads without breaking Eingang/Vorgänge, analytics remain PII-free, and remaining production-only actions are explicitly documented rather than executed.
