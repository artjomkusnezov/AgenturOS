STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-d280

# AgenturOS — Human-reviewed duplicate warning for manual capture

## Goal
Help an employee avoid creating the same manually captured inquiry twice, while keeping the decision completely manual.

## Required work
- Build on the finished phone, pasted email and personal-note capture flow.
- Before final confirmation, compare the current draft with existing inbox items using deterministic local facts already available: unchanged source text, phone/email and recent title.
- If a likely duplicate exists, show a clear warning and link/open the existing inbox item.
- Never block automatically: the employee must explicitly choose either open the existing item or create the new item anyway.
- Do not merge records, change statuses, create tasks, send replies or contact customers automatically.
- Keep source labels and original text unchanged.
- Reuse the safe local preview route and fixtures without production data.
- Add deterministic tests; run inbound tests, TypeScript, lint and build.
- Browser-check desktop/mobile and record exact evidence or blockers.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, customer communication, Meta/WhatsApp or paid services.
