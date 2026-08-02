-- AgenturOS Punkt 36C.1: Inbound Foundation (kanalneutral)
-- Additive columns on inbox_items. No channel-specific tables.
-- Architecture: Quelle → Adapter → InboundItem → Intake → Inbox

-- ---------------------------------------------------------------------------
-- 1. Source: externe Quellfamilien ergänzen (keine Messenger-Sonderlogik)
-- ---------------------------------------------------------------------------

alter table public.inbox_items drop constraint if exists inbox_items_source_valid;

alter table public.inbox_items
  add constraint inbox_items_source_valid
  check (source in ('manual_text', 'universal_capture', 'whatsapp', 'email'));

comment on column public.inbox_items.source is
  'Produktlabel der Quelle: manual_text, universal_capture, whatsapp, email (erweiterbar).';

-- ---------------------------------------------------------------------------
-- 2. InboundItem-Persistenz (kanalneutral)
-- ---------------------------------------------------------------------------

alter table public.inbox_items
  add column if not exists channel text not null default 'manual';

alter table public.inbox_items
  add column if not exists external_id text null;

alter table public.inbox_items
  add column if not exists sender jsonb null;

alter table public.inbox_items
  add column if not exists received_at timestamptz null;

alter table public.inbox_items
  add column if not exists message_kind text null;

alter table public.inbox_items
  add column if not exists inbound_metadata jsonb not null default '{}'::jsonb;

comment on column public.inbox_items.channel is
  'Quellfamilie am InboundItem: manual | whatsapp | email (erweiterbar). Capture = manual + source universal_capture.';
comment on column public.inbox_items.external_id is
  'Externe ID der Quelle für Deduplizierung pro Agency+channel.';
comment on column public.inbox_items.sender is
  'Generischer Absender: { displayName?, address?, addressKind? }.';
comment on column public.inbox_items.received_at is
  'Originalzeitstempel der Quelle; null → created_at nutzen.';
comment on column public.inbox_items.message_kind is
  'Optionale Inhaltsart des InboundItem (text|audio|image|document|…). Persistenzname historisch; semantisch = item kind.';
comment on column public.inbox_items.inbound_metadata is
  'Kleine kanalneutrale Metadaten (kein Roh-Payload-Archiv).';

alter table public.inbox_items drop constraint if exists inbox_items_channel_valid;

alter table public.inbox_items
  add constraint inbox_items_channel_valid
  check (channel in ('manual', 'whatsapp', 'email'));

alter table public.inbox_items drop constraint if exists inbox_items_message_kind_valid;

alter table public.inbox_items
  add constraint inbox_items_message_kind_valid
  check (
    message_kind is null
    or message_kind in (
      'text',
      'audio',
      'image',
      'document',
      'video',
      'location',
      'contact',
      'link',
      'unknown'
    )
  );

-- Bestehende Capture-/Manual-Zeilen: received_at = created_at
update public.inbox_items
set received_at = created_at
where received_at is null;

-- ---------------------------------------------------------------------------
-- 3. Dedup: eine externe ID pro Agency + Quellfamilie
-- ---------------------------------------------------------------------------

create unique index if not exists inbox_items_agency_channel_external_id_uidx
  on public.inbox_items (agency_id, channel, external_id)
  where external_id is not null;
