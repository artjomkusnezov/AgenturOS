/**
 * Test-only Kfz Supabase migration-chain dry run.
 *
 * Applies checked-in Kfz migrations twice on an in-memory Postgres
 * (empty schema + supported pre-analytics legacy schema). Never connects to
 * Preview/Production, never reads env URLs or credentials, and never writes
 * secrets, names, contacts, answers, filenames, object keys, free text or
 * URLs into the report.
 */

import fs from 'node:fs'
import path from 'node:path'

import { authorizeKfzDocumentReview } from '@/features/inbound/kfz/lib/kfz-document-storage'
import { validateKfzLandingConsent } from '@/features/inbound/kfz/lib/kfz-landing-steps'
import {
  KFZ_LAUNCH_REQUIRED_BRANCH_IDS,
  resolveKfzLaunchRepoRoot,
} from '@/features/inbound/kfz/lib/kfz-launch-readiness'
import { KFZ_LANDING_BRANCHES } from '@/features/inbound/kfz/lib/kfz-questionnaire'
import { KFZ_SUPABASE_RELATED_MIGRATIONS } from '@/features/inbound/kfz/lib/kfz-supabase-preflight'
import { KFZ_INBOUND_DOCUMENTS_BUCKET } from '@/features/inbound/kfz/types/kfz-document-storage'
import type {
  KfzMigrationChainCheckId,
  KfzMigrationChainCheckResult,
  KfzMigrationChainPreservedSurfaces,
  KfzMigrationChainReport,
  KfzMigrationChainTarget,
  KfzMigrationChainTargetReport,
} from '@/features/inbound/kfz/types/kfz-migration-chain-dry-run'
import {
  KFZ_MIGRATION_CHAIN_CHECK_IDS,
  KFZ_MIGRATION_CHAIN_ENGINE,
  KFZ_MIGRATION_CHAIN_SCOPE,
  KFZ_MIGRATION_CHAIN_TARGETS,
} from '@/features/inbound/kfz/types/kfz-migration-chain-dry-run'

const FIXTURE_AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const FIXTURE_MEMBER_ID = '22222222-2222-4222-8222-222222222222'
const FIXTURE_OTHER_USER_ID = '55555555-5555-4555-8555-555555555555'
const FIXTURE_ITEM_ID = '33333333-3333-4333-8333-333333333333'
const FIXTURE_OTHER_ITEM_ID = '77777777-7777-4777-8777-777777777777'
const FIXTURE_OBJECT_ID = '44444444-4444-4444-8444-444444444444'
const FIXTURE_SESSION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const FIXTURE_OBJECT_KEY = `kfz/${FIXTURE_AGENCY_ID}/${FIXTURE_OBJECT_ID}`
const FIXTURE_SUBMISSION_ID = 'kfz-dry-run-001'
const FIXTURE_EVENT_KEY = `${FIXTURE_SESSION_ID}:landing_view`
const FIXTURE_RETRY_EVENT_KEY = `${FIXTURE_SESSION_ID}:step_view:contact`
const FIXTURE_LEGACY_EVENT_KEY = `${FIXTURE_SESSION_ID}:landing_view:legacy`

const WEBSITE_MIGRATION = '20260906120000_inbox_website_channel_source.sql'
const ANALYTICS_FOUNDATION_MIGRATION = '20260909140000_kfz_funnel_analytics_events.sql'
const DOCUMENTS_MIGRATION = '20260910120000_kfz_inbound_documents_bucket.sql'
const ANALYTICS_CONTRACT_MIGRATION =
  '20260911120000_kfz_funnel_analytics_persistence_contract.sql'

const PRESERVED_ROUTE_FILES = [
  { href: '/kfz', file: 'src/app/kfz/page.tsx' },
  { href: '/app/inbox', file: 'src/app/app/inbox/page.tsx' },
  { href: '/app/inbox/kfz-document', file: 'src/app/app/inbox/kfz-document/route.ts' },
  { href: '/app/kfz-analytics', file: 'src/app/app/kfz-analytics/page.tsx' },
  { href: '/app/kfz-readiness', file: 'src/app/app/kfz-readiness/page.tsx' },
  { href: '/api/inbound/kfz', file: 'src/app/api/inbound/kfz/route.ts' },
  { href: '/api/inbound/kfz-analytics', file: 'src/app/api/inbound/kfz-analytics/route.ts' },
] as const

type MemoryDb = {
  exec: (sql: string) => Promise<unknown>
  query: <T extends Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: T[] }>
  close: () => Promise<void>
}

function check(
  id: KfzMigrationChainCheckId,
  ok: boolean,
  migration: string | null = null,
): KfzMigrationChainCheckResult {
  return { id, ok, migration }
}

function sqlErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string' && /^\d{5}$/.test(code)) {
      return code
    }
  }
  return null
}

function failedWith(
  result: { ok: true } | { ok: false; code: string | null },
  code: string,
): boolean {
  return !result.ok && result.code === code
}

function isTrue(value: unknown): boolean {
  return value === true || value === 't' || value === 'true'
}

async function execSql(
  db: MemoryDb,
  sql: string,
): Promise<{ ok: true } | { ok: false; code: string | null }> {
  try {
    await db.exec(sql)
    return { ok: true }
  } catch (error) {
    return { ok: false, code: sqlErrorCode(error) }
  }
}

async function readFlag(db: MemoryDb, sql: string): Promise<boolean> {
  const result = await db.query<{ ok: boolean | string }>(sql)
  return isTrue(result.rows[0]?.ok)
}

function foundationSql(): string {
  return `
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin nosuperuser;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin nosuperuser;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role nologin bypassrls;
      end if;
    end
    $$;

    create schema if not exists auth;
    create schema if not exists storage;

    create table if not exists auth.users (
      id uuid primary key
    );

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    create table if not exists public.agencies (
      id uuid primary key,
      name text not null,
      slug text not null unique
    );

    create table if not exists public.agency_memberships (
      agency_id uuid not null references public.agencies (id) on delete cascade,
      user_id uuid not null references auth.users (id) on delete cascade,
      status text not null default 'active'
        check (status in ('active', 'suspended', 'removed')),
      primary key (agency_id, user_id)
    );

    create or replace function public.user_has_active_agency_membership(p_agency_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = pg_catalog, public
    as $$
      select exists (
        select 1
        from public.agency_memberships as m
        where m.agency_id = p_agency_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      );
    $$;

    revoke all on function public.user_has_active_agency_membership(uuid) from public;
    revoke all on function public.user_has_active_agency_membership(uuid) from anon;
    revoke all on function public.user_has_active_agency_membership(uuid) from service_role;
    grant execute on function public.user_has_active_agency_membership(uuid) to authenticated;

    create table if not exists public.inbox_items (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users (id),
      agency_id uuid not null references public.agencies (id),
      content text not null,
      source text not null default 'manual_text',
      channel text not null default 'manual',
      external_id text,
      inbound_metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      constraint inbox_items_content_not_empty check (trim(content) <> ''),
      constraint inbox_items_source_valid check (
        source in ('manual_text', 'universal_capture', 'whatsapp', 'email')
      ),
      constraint inbox_items_channel_valid check (
        channel in ('manual', 'whatsapp', 'email')
      )
    );

    create unique index if not exists inbox_items_agency_channel_external_id_uidx
      on public.inbox_items (agency_id, channel, external_id)
      where external_id is not null;

    alter table public.inbox_items enable row level security;

    create table if not exists storage.buckets (
      id text primary key,
      name text not null unique,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );

    create table if not exists storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text not null references storage.buckets (id),
      name text not null,
      unique (bucket_id, name)
    );

    alter table storage.objects enable row level security;
    alter table storage.objects force row level security;

    insert into storage.buckets (id, name, public, file_size_limit)
    values ('user-files', 'user-files', false, 52428800)
    on conflict (id) do nothing;

    drop policy if exists user_files_storage_select_own on storage.objects;
    create policy user_files_storage_select_own
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'user-files');

    grant usage on schema public to anon, authenticated, service_role;
    grant usage on schema storage to anon, authenticated, service_role;

    insert into auth.users (id) values
      ('${FIXTURE_MEMBER_ID}'::uuid),
      ('${FIXTURE_OTHER_USER_ID}'::uuid)
    on conflict (id) do nothing;

    insert into public.agencies (id, name, slug)
    values ('${FIXTURE_AGENCY_ID}'::uuid, 'fixture', 'fixture-agency')
    on conflict (id) do nothing;

    insert into public.agency_memberships (agency_id, user_id, status)
    values ('${FIXTURE_AGENCY_ID}'::uuid, '${FIXTURE_MEMBER_ID}'::uuid, 'active')
    on conflict (agency_id, user_id) do nothing;
  `
}

function legacyDirtyEventSql(): string {
  return `
    insert into public.kfz_funnel_analytics_events (
      agency_id,
      session_id,
      event_name,
      event_key,
      occurred_at,
      properties
    )
    values (
      '${FIXTURE_AGENCY_ID}'::uuid,
      '${FIXTURE_SESSION_ID}',
      'landing_view',
      '${FIXTURE_LEGACY_EVENT_KEY}',
      '2026-09-11T00:00:00Z',
      '{"unknown_tracker":"token","branchId":"evb"}'::jsonb
    )
    on conflict (agency_id, event_key) do nothing;
  `
}

function migrationBasename(relativePath: string): string {
  return relativePath.split('/').pop() ?? relativePath
}

async function applyCheckedInKfzMigrations(
  db: MemoryDb,
  repoRoot: string,
): Promise<{ ok: true } | { ok: false; migration: string }> {
  for (const relativePath of KFZ_SUPABASE_RELATED_MIGRATIONS) {
    const sql = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
    const result = await execSql(db, sql)
    if (!result.ok) {
      return { ok: false, migration: migrationBasename(relativePath) }
    }
  }
  return { ok: true }
}

async function seedTarget(
  db: MemoryDb,
  target: KfzMigrationChainTarget,
  repoRoot: string,
): Promise<KfzMigrationChainCheckResult> {
  const seeded = await execSql(db, foundationSql())
  if (!seeded.ok) {
    return check('seed_foundation', false)
  }
  if (target === 'empty') {
    return check('seed_foundation', true)
  }

  const preAnalytics = [
    `supabase/migrations/${WEBSITE_MIGRATION}`,
    `supabase/migrations/${ANALYTICS_FOUNDATION_MIGRATION}`,
    `supabase/migrations/${DOCUMENTS_MIGRATION}`,
  ] as const

  for (const relativePath of preAnalytics) {
    const sql = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
    const applied = await execSql(db, sql)
    if (!applied.ok) {
      return check('seed_foundation', false, migrationBasename(relativePath))
    }
  }

  const dirty = await execSql(db, legacyDirtyEventSql())
  return check('seed_foundation', dirty.ok, dirty.ok ? null : ANALYTICS_FOUNDATION_MIGRATION)
}

async function verifyPrivateBucket(db: MemoryDb): Promise<KfzMigrationChainCheckResult> {
  const ok = await readFlag(
    db,
    `
      select exists (
        select 1
        from storage.buckets
        where id = '${KFZ_INBOUND_DOCUMENTS_BUCKET}'
          and name = '${KFZ_INBOUND_DOCUMENTS_BUCKET}'
          and public = false
          and file_size_limit = 8388608
      ) as ok
    `,
  )
  return check('private_bucket', ok, DOCUMENTS_MIGRATION)
}

async function verifyPrivateBucketPolicies(
  db: MemoryDb,
): Promise<KfzMigrationChainCheckResult> {
  const ok = await readFlag(
    db,
    `
      select (
        not exists (
          select 1
          from pg_policies
          where schemaname = 'storage'
            and tablename = 'objects'
            and (
              coalesce(qual, '') ilike '%${KFZ_INBOUND_DOCUMENTS_BUCKET}%'
              or coalesce(with_check, '') ilike '%${KFZ_INBOUND_DOCUMENTS_BUCKET}%'
            )
        )
        and not exists (
          select 1
          from pg_policies
          where schemaname = 'storage'
            and tablename = 'objects'
            and 'anon' = any(roles)
            and (
              coalesce(qual, '') ilike '%${KFZ_INBOUND_DOCUMENTS_BUCKET}%'
              or coalesce(with_check, '') ilike '%${KFZ_INBOUND_DOCUMENTS_BUCKET}%'
            )
        )
      ) as ok
    `,
  )
  return check('private_bucket_policies', ok, DOCUMENTS_MIGRATION)
}

async function verifySubmissionInboxLinkage(
  db: MemoryDb,
): Promise<KfzMigrationChainCheckResult> {
  const inserted = await execSql(
    db,
    `
      insert into public.inbox_items (
        id,
        user_id,
        agency_id,
        content,
        source,
        channel,
        external_id,
        inbound_metadata
      )
      values (
        '${FIXTURE_ITEM_ID}'::uuid,
        '${FIXTURE_MEMBER_ID}'::uuid,
        '${FIXTURE_AGENCY_ID}'::uuid,
        'kfz_inquiry',
        'website',
        'website',
        '${FIXTURE_SUBMISSION_ID}',
        jsonb_build_object(
          'uploadMeta',
          jsonb_build_array(
            jsonb_build_object('objectKey', '${FIXTURE_OBJECT_KEY}', 'group', 'vehicle_registration')
          )
        )
      )
      on conflict (id) do nothing
    `,
  )
  if (!inserted.ok) {
    return check('submission_inbox_linkage', false, WEBSITE_MIGRATION)
  }

  const ok = await readFlag(
    db,
    `
      select (
        count(*) = 1
        and bool_and(channel = 'website')
        and bool_and(source = 'website')
        and bool_and(inbound_metadata ? 'uploadMeta')
        and bool_and(jsonb_typeof(inbound_metadata->'uploadMeta') = 'array')
        and bool_and(jsonb_array_length(inbound_metadata->'uploadMeta') = 1)
      ) as ok
      from public.inbox_items
      where agency_id = '${FIXTURE_AGENCY_ID}'::uuid
        and channel = 'website'
        and external_id = '${FIXTURE_SUBMISSION_ID}'
    `,
  )
  return check('submission_inbox_linkage', ok, WEBSITE_MIGRATION)
}

function verifyAuthorizedReview(): KfzMigrationChainCheckResult {
  const item = {
    id: FIXTURE_ITEM_ID,
    agencyId: FIXTURE_AGENCY_ID,
    objectKeys: [FIXTURE_OBJECT_KEY],
    filenameByObjectKey: { [FIXTURE_OBJECT_KEY]: 'dokument' },
    mimeTypeByObjectKey: { [FIXTURE_OBJECT_KEY]: 'application/pdf' },
  }

  const anonymous = authorizeKfzDocumentReview({
    actor: { authenticated: false, agencyId: null },
    item,
    requestedItemId: FIXTURE_ITEM_ID,
    requestedObjectKey: FIXTURE_OBJECT_KEY,
  })
  const crossItem = authorizeKfzDocumentReview({
    actor: { authenticated: true, agencyId: FIXTURE_AGENCY_ID },
    item,
    requestedItemId: FIXTURE_OTHER_ITEM_ID,
    requestedObjectKey: FIXTURE_OBJECT_KEY,
  })
  const authorized = authorizeKfzDocumentReview({
    actor: { authenticated: true, agencyId: FIXTURE_AGENCY_ID },
    item,
    requestedItemId: FIXTURE_ITEM_ID,
    requestedObjectKey: FIXTURE_OBJECT_KEY,
  })

  const ok =
    anonymous.ok === false &&
    anonymous.status === 401 &&
    crossItem.ok === false &&
    crossItem.status === 404 &&
    authorized.ok === true

  return check('authorized_review', ok, DOCUMENTS_MIGRATION)
}

async function verifyAnalyticsAllowlist(
  db: MemoryDb,
  target: KfzMigrationChainTarget,
): Promise<KfzMigrationChainCheckResult> {
  const allowed = await execSql(
    db,
    `
      insert into public.kfz_funnel_analytics_events (
        agency_id, session_id, event_name, event_key, occurred_at, properties
      )
      values (
        '${FIXTURE_AGENCY_ID}'::uuid,
        '${FIXTURE_SESSION_ID}',
        'step_view',
        '${FIXTURE_SESSION_ID}:step_view:documents',
        '2026-09-11T01:00:00Z',
        '{"branchId":"switch_car","stepId":"contact","fromStepId":"branch","lastStepId":"contact","trafficSource":"utm","referrerCategory":"search","activeMs":1200}'::jsonb
      )
    `,
  )
  const forbidden = await execSql(
    db,
    `
      insert into public.kfz_funnel_analytics_events (
        agency_id, session_id, event_name, event_key, occurred_at, properties
      )
      values (
        '${FIXTURE_AGENCY_ID}'::uuid,
        '${FIXTURE_SESSION_ID}',
        'step_view',
        '${FIXTURE_SESSION_ID}:step_view:forbidden',
        '2026-09-11T01:00:01Z',
        '{"unknown_tracker":"token"}'::jsonb
      )
    `,
  )

  let legacyOk = true
  if (target === 'legacy_pre_analytics') {
    legacyOk = await readFlag(
      db,
      `
        select (
          properties = '{"branchId":"evb"}'::jsonb
          and not (properties ? 'unknown_tracker')
        ) as ok
        from public.kfz_funnel_analytics_events
        where event_key = '${FIXTURE_LEGACY_EVENT_KEY}'
      `,
    )
  }

  const ok = allowed.ok && failedWith(forbidden, '23514') && legacyOk
  return check('analytics_allowlist', ok, ANALYTICS_CONTRACT_MIGRATION)
}

async function verifyUniqueRetry(db: MemoryDb): Promise<KfzMigrationChainCheckResult> {
  const firstAnalytics = await execSql(
    db,
    `
      insert into public.kfz_funnel_analytics_events (
        agency_id, session_id, event_name, event_key, occurred_at, properties
      )
      values (
        '${FIXTURE_AGENCY_ID}'::uuid,
        '${FIXTURE_SESSION_ID}',
        'step_view',
        '${FIXTURE_RETRY_EVENT_KEY}',
        '2026-09-11T02:00:00Z',
        '{"stepId":"contact","activeMs":400}'::jsonb
      )
    `,
  )
  const retryAnalytics = await execSql(
    db,
    `
      insert into public.kfz_funnel_analytics_events (
        agency_id, session_id, event_name, event_key, occurred_at, properties
      )
      values (
        '${FIXTURE_AGENCY_ID}'::uuid,
        '${FIXTURE_SESSION_ID}',
        'step_view',
        '${FIXTURE_RETRY_EVENT_KEY}',
        '2026-09-11T02:00:01Z',
        '{"stepId":"contact","activeMs":800}'::jsonb
      )
    `,
  )
  const retryInbox = await execSql(
    db,
    `
      insert into public.inbox_items (
        user_id,
        agency_id,
        content,
        source,
        channel,
        external_id
      )
      values (
        '${FIXTURE_MEMBER_ID}'::uuid,
        '${FIXTURE_AGENCY_ID}'::uuid,
        'kfz_inquiry',
        'website',
        'website',
        '${FIXTURE_SUBMISSION_ID}'
      )
    `,
  )

  const oneAnalytics = await readFlag(
    db,
    `
      select count(*) = 1 as ok
      from public.kfz_funnel_analytics_events
      where event_key = '${FIXTURE_RETRY_EVENT_KEY}'
    `,
  )
  const oneInbox = await readFlag(
    db,
    `
      select count(*) = 1 as ok
      from public.inbox_items
      where agency_id = '${FIXTURE_AGENCY_ID}'::uuid
        and channel = 'website'
        and external_id = '${FIXTURE_SUBMISSION_ID}'
    `,
  )

  const ok =
    firstAnalytics.ok &&
    failedWith(retryAnalytics, '23505') &&
    failedWith(retryInbox, '23505') &&
    oneAnalytics &&
    oneInbox

  return check('unique_retry', ok, ANALYTICS_FOUNDATION_MIGRATION)
}

async function verifyNoPublicReads(db: MemoryDb): Promise<KfzMigrationChainCheckResult> {
  const grantsOk = await readFlag(
    db,
    `
      select (
        not exists (
          select 1
          from information_schema.role_table_grants
          where table_schema = 'public'
            and table_name = 'kfz_funnel_analytics_events'
            and grantee in ('anon', 'public')
        )
        and not exists (
          select 1
          from pg_policies
          where schemaname = 'public'
            and tablename = 'kfz_funnel_analytics_events'
            and cmd = 'SELECT'
            and 'anon' = any(roles)
        )
        and exists (
          select 1
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relname = 'kfz_funnel_analytics_events'
            and c.relrowsecurity
            and c.relforcerowsecurity
        )
      ) as ok
    `,
  )

  await db.exec('reset role')
  const anonSelect = await execSql(
    db,
    `
      set role anon;
      select count(*) from public.kfz_funnel_analytics_events;
    `,
  )
  await db.exec('reset role')

  const memberSelect = await execSql(
    db,
    `
      select set_config('request.jwt.claim.sub', '${FIXTURE_MEMBER_ID}', false);
      set role authenticated;
      select count(*) from public.kfz_funnel_analytics_events;
    `,
  )
  await db.exec('reset role')

  const strangerSelect = await execSql(
    db,
    `
      select set_config('request.jwt.claim.sub', '${FIXTURE_OTHER_USER_ID}', false);
      set role authenticated;
      select count(*) from public.kfz_funnel_analytics_events;
    `,
  )
  await db.exec('reset role')

  let memberVisible = false
  let strangerVisible = true
  await db.exec(`select set_config('request.jwt.claim.sub', '${FIXTURE_MEMBER_ID}', false)`)
  await db.exec('set role authenticated')
  memberVisible = await readFlag(
    db,
    'select count(*) > 0 as ok from public.kfz_funnel_analytics_events',
  )
  await db.exec('reset role')
  await db.exec(`select set_config('request.jwt.claim.sub', '${FIXTURE_OTHER_USER_ID}', false)`)
  await db.exec('set role authenticated')
  strangerVisible = await readFlag(
    db,
    'select count(*) > 0 as ok from public.kfz_funnel_analytics_events',
  )
  await db.exec('reset role')

  const anonBlocked = !anonSelect.ok
  const ok =
    grantsOk &&
    anonBlocked &&
    memberSelect.ok &&
    memberVisible &&
    strangerSelect.ok &&
    strangerVisible === false

  return check('no_public_reads', ok, ANALYTICS_CONTRACT_MIGRATION)
}

function inspectPreservedSurfaces(
  repoRoot: string,
): KfzMigrationChainPreservedSurfaces {
  const routes = PRESERVED_ROUTE_FILES.every((route) =>
    fs.existsSync(path.join(repoRoot, route.file)),
  )
  const branchIds = KFZ_LANDING_BRANCHES.map((branch) => branch.id)
  const sixBranches =
    KFZ_LANDING_BRANCHES.length === 6 &&
    KFZ_LAUNCH_REQUIRED_BRANCH_IDS.every((id, index) => branchIds[index] === id)
  const questionnaire = fs.existsSync(
    path.join(repoRoot, 'src/features/inbound/kfz/lib/kfz-questionnaire.ts'),
  )
  const consent =
    fs.existsSync(path.join(repoRoot, 'src/features/inbound/kfz/lib/kfz-landing-steps.ts')) &&
    validateKfzLandingConsent(false).ok === false &&
    validateKfzLandingConsent(true).ok === true
  const readiness = fs.existsSync(
    path.join(repoRoot, 'src/app/app/kfz-readiness/page.tsx'),
  )
  const analyticsUi = fs.existsSync(
    path.join(repoRoot, 'src/app/app/kfz-analytics/page.tsx'),
  )

  return { routes, sixBranches, questionnaire, consent, readiness, analyticsUi }
}

async function openMemoryDatabase(): Promise<MemoryDb> {
  const { PGlite } = await import('@electric-sql/pglite')
  const db = new PGlite()
  await db.waitReady
  return db
}

async function runTarget(
  target: KfzMigrationChainTarget,
  repoRoot: string,
  preserved: KfzMigrationChainPreservedSurfaces,
): Promise<KfzMigrationChainTargetReport> {
  const db = await openMemoryDatabase()
  const checks: KfzMigrationChainCheckResult[] = []
  let applyPasses: 0 | 1 | 2 = 0

  try {
    const seeded = await seedTarget(db, target, repoRoot)
    checks.push(seeded)
    if (!seeded.ok) {
      return { target, ok: false, applyPasses, checks: completeChecks(checks, preserved) }
    }

    const first = await applyCheckedInKfzMigrations(db, repoRoot)
    checks.push(
      check('apply_first', first.ok, first.ok ? null : first.migration),
    )
    if (!first.ok) {
      return { target, ok: false, applyPasses, checks: completeChecks(checks, preserved) }
    }
    applyPasses = 1

    const second = await applyCheckedInKfzMigrations(db, repoRoot)
    checks.push(
      check('apply_second', second.ok, second.ok ? null : second.migration),
    )
    if (!second.ok) {
      return { target, ok: false, applyPasses, checks: completeChecks(checks, preserved) }
    }
    applyPasses = 2

    checks.push(await verifyPrivateBucket(db))
    checks.push(await verifyPrivateBucketPolicies(db))
    checks.push(await verifySubmissionInboxLinkage(db))
    checks.push(verifyAuthorizedReview())
    checks.push(await verifyAnalyticsAllowlist(db, target))
    checks.push(await verifyUniqueRetry(db))
    checks.push(await verifyNoPublicReads(db))
    checks.push(
      check(
        'preserved_surfaces',
        Object.values(preserved).every(Boolean),
      ),
    )
  } finally {
    await db.close()
  }

  const full = completeChecks(checks, preserved)
  return {
    target,
    ok: full.every((entry) => entry.ok),
    applyPasses,
    checks: full,
  }
}

function completeChecks(
  checks: readonly KfzMigrationChainCheckResult[],
  preserved: KfzMigrationChainPreservedSurfaces,
): KfzMigrationChainCheckResult[] {
  const byId = new Map(checks.map((entry) => [entry.id, entry]))
  return KFZ_MIGRATION_CHAIN_CHECK_IDS.map((id) => {
    const existing = byId.get(id)
    if (existing) {
      return existing
    }
    if (id === 'preserved_surfaces') {
      return check(id, Object.values(preserved).every(Boolean))
    }
    return check(id, false)
  })
}

export function listKfzMigrationChainForbiddenReportValues(): string[] {
  return [
    FIXTURE_OBJECT_KEY,
    FIXTURE_SUBMISSION_ID,
    FIXTURE_EVENT_KEY,
    FIXTURE_RETRY_EVENT_KEY,
    FIXTURE_LEGACY_EVENT_KEY,
    FIXTURE_OBJECT_ID,
    'unknown_tracker',
    'dokument',
    'vehicle_registration',
  ]
}

export function kfzMigrationChainReportLeaks(report: KfzMigrationChainReport): string[] {
  const serialized = JSON.stringify(report)
  return listKfzMigrationChainForbiddenReportValues().filter((value) =>
    serialized.includes(value),
  )
}

export async function runKfzMigrationChainDryRun(input: {
  repoRoot?: string
} = {}): Promise<KfzMigrationChainReport> {
  const repoRoot = input.repoRoot ?? resolveKfzLaunchRepoRoot()
  const preserved = inspectPreservedSurfaces(repoRoot)
  const targets: KfzMigrationChainTargetReport[] = []

  for (const target of KFZ_MIGRATION_CHAIN_TARGETS) {
    targets.push(await runTarget(target, repoRoot, preserved))
  }

  return {
    ok: targets.every((entry) => entry.ok) && Object.values(preserved).every(Boolean),
    scope: KFZ_MIGRATION_CHAIN_SCOPE,
    productionClaim: false,
    appliesRemote: false,
    engine: KFZ_MIGRATION_CHAIN_ENGINE,
    targets,
    preserved,
  }
}
