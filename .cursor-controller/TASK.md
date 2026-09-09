STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-c3f6

# AgenturOS — Manual review of exact duplicate candidates

## Goal
Help an employee notice when a new inbound item may belong to an already existing inquiry, using only exact normalized factual matches and requiring an explicit human decision. Never merge, close or contact automatically.

## Required work
- Build directly on PR #36 and reuse the unified inbound queue, factual search, review card, statuses and history.
- On an inbound review card, show a small “Möglicherweise bereits vorhanden” section only for deterministic exact normalized matches on phone, email, vehicle registration or an existing explicit external/reference ID.
- Explain every candidate with the exact matching field and show received time, source, status and short existing summary.
- Never use name-only matching, fuzzy matching, AI guesses, external enrichment or hidden fields.
- Let the employee open the candidate and return without losing queue/search/filter state.
- Provide explicit manual actions: “Kein Duplikat” and “Als zusammengehörig markieren”. The latter may create a reversible factual relation between the two items, but must not merge/delete either record, copy data, change status, contact the customer or complete work.
- Record each manual decision in factual history and preserve it after reload. Allow the employee to remove the relation.
- If data is missing or ambiguous, show no automatic decision.
- Keep desktop/mobile clear and avoid dense tables.
- Add deterministic tests for exact phone/email/plate/reference matches, phone formatting, no name-only/fuzzy match, multiple candidates, manual relation/unlink, history, reload, state preservation and zero automatic mutations.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build.
- Browser-check desktop/mobile fixtures: review new Kfz landing inquiry, inspect exact phone and plate candidates, open/return, mark related, undo, reload; verify no status/customer communication changes.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, automatic merge/delete/status/contact/task, AI identity decision, external enrichment, paid services or destructive git.
