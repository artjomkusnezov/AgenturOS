-- AgenturOS Kfz Gate 2 repair: allow provider-neutral website channel/source.
-- Additive only: existing allowed values remain; no columns dropped or weakened.

alter table public.inbox_items drop constraint if exists inbox_items_source_valid;

alter table public.inbox_items
  add constraint inbox_items_source_valid
  check (
    source in (
      'manual_text',
      'universal_capture',
      'whatsapp',
      'email',
      'website'
    )
  );

comment on column public.inbox_items.source is
  'Produktlabel der Quelle: manual_text, universal_capture, whatsapp, email, website (erweiterbar).';

alter table public.inbox_items drop constraint if exists inbox_items_channel_valid;

alter table public.inbox_items
  add constraint inbox_items_channel_valid
  check (channel in ('manual', 'whatsapp', 'email', 'website'));

comment on column public.inbox_items.channel is
  'Quellfamilie am InboundItem: manual | whatsapp | email | website (erweiterbar). Capture = manual + source universal_capture.';
