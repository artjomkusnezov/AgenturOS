-- First-party Kfz funnel analytics.
-- Anonymous allow-listed events only. No form answers, contact data, IP or URLs.
-- Additive. Safe to re-run. Apply on Preview/Production remains an Owner step.

create table if not exists public.kfz_funnel_analytics_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  session_id text not null,
  event_name text not null,
  event_key text not null,
  occurred_at timestamptz not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint kfz_funnel_analytics_events_session_id_uuid
    check (session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  constraint kfz_funnel_analytics_events_event_name_valid
    check (
      event_name in (
        'landing_view',
        'traffic_source',
        'funnel_start',
        'initial_branch_selected',
        'step_view',
        'step_completed',
        'back_navigation',
        'validation_blocked',
        'submit_started',
        'submit_failed',
        'submit_succeeded',
        'funnel_abandoned'
      )
    )
);

comment on table public.kfz_funnel_analytics_events is
  'Anonymous first-party Kfz funnel events. No customer answers or personal data.';
comment on column public.kfz_funnel_analytics_events.session_id is
  'Random UUID created only after analytics consent=granted. Not a login or fingerprint.';
comment on column public.kfz_funnel_analytics_events.properties is
  'Allow-listed coarse properties only (step/branch/source/error/activeMs).';

create unique index if not exists kfz_funnel_analytics_events_agency_event_key_uidx
  on public.kfz_funnel_analytics_events (agency_id, event_key);

create index if not exists kfz_funnel_analytics_events_agency_occurred_at_idx
  on public.kfz_funnel_analytics_events (agency_id, occurred_at desc);

alter table public.kfz_funnel_analytics_events enable row level security;

drop policy if exists kfz_funnel_analytics_events_select_agency_member
  on public.kfz_funnel_analytics_events;

create policy kfz_funnel_analytics_events_select_agency_member
  on public.kfz_funnel_analytics_events
  for select
  to authenticated
  using (public.user_has_active_agency_membership(agency_id));

grant select on public.kfz_funnel_analytics_events to authenticated;
grant all on public.kfz_funnel_analytics_events to service_role;
