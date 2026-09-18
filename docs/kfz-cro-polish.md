# Kfz CRO/UX polish for the first Meta test

Small visual polish on the current `/kfz` after PR #67 (`0b61cc1`). No funnel V2, no backend/schema change, no Meta/WhatsApp activation.

## Item 1 — First step / consent friction

Consent stays **above** the questionnaire. Moving it would change privacy/analytics semantics (`landing_view` only after grant; decline stores nothing).

Compact treatment only:

- short line + grant/decline on one row
- full allow-list copy remains in “Was wird gemessen?”
- on mobile the form card is first after `Kfz-Check starten` (`#kfz-anfrage`), explainer is below

## Item 2 — Six scenarios, visual priority only

All six branches and routing stay. “Bestehendes Auto wechseln” is the visual recommendation with badge **Am häufigsten**. The other five stay fully accessible under **Anderer Anlass?**. Deep links, drafts, attribution and analytics are unchanged.

## Item 3 — No premature completion copy

Idle no longer shows “Bereit zum Senden”. Intermediate actions use **Weiter** / **Zurück**. Only the last screen uses **Unverbindliche Anfrage senden** (or **Erneut senden** / “Wird gesendet …”).

## Item 4 — Mobile sticky primary action + progress

Sticky **Weiter** on mobile questionnaire/branch/document steps, with safe-area padding and a spacer so fields are not covered. Desktop stays static. Final consent/submit is **not** sticky, so legal text stays visible.

Progress keeps the existing dynamic contract: `Schritt X von Y · {screen title}`. `Y` is the current visible screen count after branching. A fixed “Persönliche Prüfung” total would be untrue when later screens appear or disappear.

## Item 5 — German date + microcopy

Native `type="date"` stays. Stored/validated value remains `YYYY-MM-DD` for accessibility and the existing contract. Visible guidance is **TT.MM.JJJJ**; `lang="de"` is set on the input. Optional fields say `(optional)`, required fields expose **Pflichtfeld**.

## Out of scope / unchanged

Backend architecture, ~10-step questionnaire, Supabase, Inbox/Leads, documents, attribution, privacy-safe analytics, Römer/Lengerich hero, Allianz branding, Artjom/Vera, Google proof, retry exact-once.
