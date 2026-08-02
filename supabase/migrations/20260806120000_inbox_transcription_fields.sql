-- AgenturOS Punkt 33B.2A: Transkriptionsfelder am Eingang
-- Audio bleibt Originalinformation; Transkript ist abgeleitete Interpretation.
-- Keine neue Transcript-Tabelle; content wird nicht automatisch überschrieben.

alter table public.inbox_items
  add column transcription_status text not null default 'none',
  add column transcript_text text null,
  add column transcription_error text null,
  add column detected_language text null,
  add column transcription_provider text null,
  add column transcription_model text null,
  add column transcription_started_at timestamptz null,
  add column transcription_completed_at timestamptz null;

alter table public.inbox_items
  add constraint inbox_items_transcription_status_valid
  check (
    transcription_status in (
      'none',
      'pending',
      'processing',
      'completed',
      'failed'
    )
  );

comment on column public.inbox_items.transcription_status is
  'Status der Spracherkennung: none | pending | processing | completed | failed.';
comment on column public.inbox_items.transcript_text is
  'Abgeleitetes Transkript; getrennt von content (menschliche Inhaltsfläche).';
comment on column public.inbox_items.transcription_error is
  'Letzte verständliche Fehlermeldung bei fehlgeschlagener Transkription.';
comment on column public.inbox_items.detected_language is
  'Vom Provider gemeldete Sprache(n), soweit verfügbar.';
comment on column public.inbox_items.transcription_provider is
  'Technischer Provider-Name (z. B. deepgram).';
comment on column public.inbox_items.transcription_model is
  'Provider-Modell (z. B. nova-3).';
comment on column public.inbox_items.transcription_started_at is
  'Zeitpunkt, zu dem die Transkription in processing überging.';
comment on column public.inbox_items.transcription_completed_at is
  'Zeitpunkt von completed oder failed.';

create index inbox_items_user_id_transcription_status_idx
  on public.inbox_items (user_id, transcription_status);
