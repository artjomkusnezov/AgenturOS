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
- `/dev/leads` and `/dev/leads-dashboard` — local preview only (`NODE_ENV !== 'production'`)
