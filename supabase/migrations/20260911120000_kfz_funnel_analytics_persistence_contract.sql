-- Additive persistence contract for already-created kfz_funnel_analytics_events.
-- Safe to re-run. Does not drop the table or rewrite history.
-- Anonymous funnel events only: allow-listed aggregate metadata.
-- Consent is a write gate (ingest API). Data-quality counters stay derived.
-- Apply on Preview/Production remains an Owner step. This file does not apply itself.

create or replace function public.kfz_funnel_analytics_properties_are_allowed(properties jsonb)
returns boolean
language sql
immutable
as $$
  select
    properties is not null
    and jsonb_typeof(properties) = 'object'
    and properties - array[
      'stepId',
      'fromStepId',
      'branchId',
      'trafficSource',
      'referrerCategory',
      'utmSource',
      'utmCampaign',
      'fieldId',
      'errorCategory',
      'activeMs',
      'lastStepId'
    ] = '{}'::jsonb
    and (
      not properties ? 'trafficSource'
      or properties->>'trafficSource' in ('direct', 'utm', 'campaign')
    )
    and (
      not properties ? 'referrerCategory'
      or properties->>'referrerCategory' in ('direct', 'search', 'social', 'internal', 'other')
    )
    and (
      not properties ? 'errorCategory'
      or properties->>'errorCategory' in (
        'timeout',
        'rate_limited',
        'invalid_consent',
        'invalid_payload',
        'network',
        'server',
        'unknown'
      )
    )
    and (
      not properties ? 'branchId'
      or properties->>'branchId' in (
        'upload_documents',
        'no_documents',
        'first_car',
        'additional_car',
        'switch_car',
        'evb'
      )
    )
    and (
      not properties ? 'stepId'
      or properties->>'stepId' in (
        'branch',
        'intent',
        'registration',
        'vehicle',
        'ownership',
        'usage',
        'drivers',
        'insurance',
        'claims',
        'coverage',
        'contact',
        'documents'
      )
    )
    and (
      not properties ? 'fromStepId'
      or properties->>'fromStepId' in (
        'branch',
        'intent',
        'registration',
        'vehicle',
        'ownership',
        'usage',
        'drivers',
        'insurance',
        'claims',
        'coverage',
        'contact',
        'documents'
      )
    )
    and (
      not properties ? 'lastStepId'
      or properties->>'lastStepId' in (
        'branch',
        'intent',
        'registration',
        'vehicle',
        'ownership',
        'usage',
        'drivers',
        'insurance',
        'claims',
        'coverage',
        'contact',
        'documents'
      )
    )
    and (
      not properties ? 'utmSource'
      or properties->>'utmSource' in (
        'google',
        'bing',
        'duckduckgo',
        'yahoo',
        'instagram',
        'facebook',
        'whatsapp',
        'email',
        'newsletter',
        'allianz',
        'artkus',
        'direct',
        'kfz'
      )
    )
    and (
      not properties ? 'utmCampaign'
      or properties->>'utmCampaign' in (
        'kfz',
        'kfz-check',
        'kfz-landing',
        'wechsel',
        'evb',
        'first-car',
        'additional-car',
        'switch-car',
        'no-documents'
      )
    )
    and (
      not properties ? 'fieldId'
      or properties->>'fieldId' in (
        'intent',
        'intent_other',
        'registration_status',
        'evb_purpose',
        'license_plate',
        'start_date',
        'hsn',
        'tsn',
        'vehicle_make',
        'vehicle_model',
        'first_registration',
        'current_mileage',
        'owner_is_policyholder',
        'owner_relationship',
        'financing',
        'usage',
        'annual_mileage',
        'parking',
        'policyholder_dob',
        'license_date',
        'drivers',
        'partner_dob',
        'partner_license_date',
        'youngest_driver_dob',
        'additional_drivers_note',
        'has_previous_kfz',
        'previous_insurer',
        'previous_policy_number',
        'previous_contract_end',
        'sf_class_haftpflicht',
        'sf_class_vollkasko',
        'sf_source',
        'has_claims',
        'claims_details',
        'coverage',
        'deductible_partial',
        'deductible_full',
        'missing_request_type',
        'missing_field',
        'missing_contact',
        'invalid_contact',
        'whatsapp_requires_phone',
        'invalid_consent',
        'invalid_field',
        'oversized_field',
        'full_name',
        'postal_code',
        'city',
        'phone',
        'email',
        'preferred_channel',
        'inquiry_processing_consent'
      )
    )
    and (
      not properties ? 'activeMs'
      or (
        jsonb_typeof(properties->'activeMs') = 'number'
        and (properties->>'activeMs')::numeric >= 0
        and (properties->>'activeMs')::numeric <= 86400000
      )
    )
    and coalesce(
      (
        select bool_and(
          value !~* 'https?://'
          and value not like '%@%.%'
          and position('?' in value) = 0
          and char_length(value) <= 64
        )
        from jsonb_each_text(properties) as e(key, value)
        where key <> 'activeMs'
      ),
      true
    );
$$;

comment on function public.kfz_funnel_analytics_properties_are_allowed(jsonb) is
  'Allow-listed Kfz analytics properties only. Rejects names, contacts, answers, filenames, object keys, free text, full URLs/query strings, secrets and personal identifiers.';

-- Discard unknown keys and invalid values from already-created rows so the
-- CHECK can be added without failing on prior writes.
update public.kfz_funnel_analytics_events
set properties = coalesce(
  (
    select jsonb_object_agg(key, value)
    from jsonb_each(properties) as e(key, value)
    where public.kfz_funnel_analytics_properties_are_allowed(
      jsonb_build_object(key, value)
    )
  ),
  '{}'::jsonb
)
where not public.kfz_funnel_analytics_properties_are_allowed(properties);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kfz_funnel_analytics_events_properties_allowlisted'
      and conrelid = 'public.kfz_funnel_analytics_events'::regclass
  ) then
    alter table public.kfz_funnel_analytics_events
      add constraint kfz_funnel_analytics_events_properties_allowlisted
      check (public.kfz_funnel_analytics_properties_are_allowed(properties));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'kfz_funnel_analytics_events_event_key_shape'
      and conrelid = 'public.kfz_funnel_analytics_events'::regclass
  ) then
    alter table public.kfz_funnel_analytics_events
      add constraint kfz_funnel_analytics_events_event_key_shape
      check (
        event_key like session_id || ':%'
        and char_length(event_key) <= 180
      );
  end if;
end
$$;

comment on table public.kfz_funnel_analytics_events is
  'Anonymous first-party Kfz funnel events. Approved metadata only: coarse source/referrer category, visit, branch, reached step, stop point, site/step timing, transitions and submission. Consent is a write gate, not a stored column. Data-quality counters are derived at authorized server-side review. No customer answers or personal data.';
comment on column public.kfz_funnel_analytics_events.properties is
  'Allow-listed coarse properties only (step/branch/source/referrer/error/activeMs/lastStep). Names, contacts, answers, filenames, object keys, free text, full URLs/query strings and secrets are rejected.';

alter table public.kfz_funnel_analytics_events enable row level security;
alter table public.kfz_funnel_analytics_events force row level security;

revoke all on table public.kfz_funnel_analytics_events from public;
revoke all on table public.kfz_funnel_analytics_events from anon;
revoke insert, update, delete, truncate on table public.kfz_funnel_analytics_events from authenticated;

drop policy if exists kfz_funnel_analytics_events_select_agency_member
  on public.kfz_funnel_analytics_events;
drop policy if exists kfz_funnel_analytics_events_insert_anon
  on public.kfz_funnel_analytics_events;
drop policy if exists kfz_funnel_analytics_events_insert_authenticated
  on public.kfz_funnel_analytics_events;
drop policy if exists kfz_funnel_analytics_events_update_authenticated
  on public.kfz_funnel_analytics_events;
drop policy if exists kfz_funnel_analytics_events_delete_authenticated
  on public.kfz_funnel_analytics_events;

-- Public/anon cannot read or write. Authenticated members may select for
-- server-side authorized aggregate review only. Anonymous event writes go
-- through /api/inbound/kfz-analytics → sanitizer → service_role.
create policy kfz_funnel_analytics_events_select_agency_member
  on public.kfz_funnel_analytics_events
  for select
  to authenticated
  using (public.user_has_active_agency_membership(agency_id));

grant select on table public.kfz_funnel_analytics_events to authenticated;
grant all on table public.kfz_funnel_analytics_events to service_role;
