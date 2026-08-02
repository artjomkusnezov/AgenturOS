-- AgenturOS Punkt 37C: additive InboundItem fields (kanalneutral)
-- title + origin on inbox_items. No email-specific columns.

alter table public.inbox_items
  add column if not exists title text null;

alter table public.inbox_items
  add column if not exists origin jsonb null;

comment on column public.inbox_items.title is
  'Optionaler Titel der eingehenden Information (z. B. E-Mail-Betreff). Generisch, nicht kanalspezifisch.';
comment on column public.inbox_items.origin is
  'Optionaler ursprünglicher Urheber: { displayName?, address?, addressKind? }. sender = Übermittler.';
