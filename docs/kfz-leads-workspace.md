# Kfz Leads workspace

Employee surface for website Kfz inquiries. Source of truth remains `inbox_items`.

## Persistence

No additive migration. Lead status is stored on the existing inbox working copy:

- operator note `Lead-Status: …`
- existing contacted note, when present
- `processed_at` for Gewonnen / Verloren

A Kfz submission stays a Lead until an employee explicitly promotes it.

## Routes

- `/app/leads` — authenticated employee workspace
- `/app` KPI **Offene Leads** — real count of Kfz leads that are not won or lost
- Navigation under Vorgänge → **Leads** — same open-lead count as a badge (desktop and mobile)
- `/app/inbox` Kfz detail — explicit link to the same item under Leads; Leads detail links back to Eingang
- `/dev/leads` and `/dev/leads-dashboard` — local preview only (`NODE_ENV !== 'production'`)
