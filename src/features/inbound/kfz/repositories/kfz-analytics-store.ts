import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'

import {
  addKfzAnalyticsHealthFacts,
  emptyKfzAnalyticsHealthSnapshot,
} from '@/features/inbound/kfz/lib/kfz-analytics-health'
import { lockKfzAnalyticsFirstTouchProperties } from '@/features/inbound/kfz/lib/kfz-analytics-traffic-source'
import {
  isKfzAnalyticsDuplicateKeyError,
  kfzAnalyticsRecordPassesPersistenceContract,
} from '@/features/inbound/kfz/lib/kfz-analytics-persistence-contract'
import { sanitizeKfzAnalyticsRecord } from '@/features/inbound/kfz/lib/kfz-analytics-redact'
import type {
  KfzAnalyticsHealthFacts,
  KfzAnalyticsHealthSnapshot,
  KfzAnalyticsRecord,
  KfzAnalyticsStore,
} from '@/features/inbound/kfz/types/kfz-analytics'
import { createClient } from '@/lib/supabase/server'
import type { Database, Json } from '@/lib/supabase/types'

type AnalyticsRow = {
  event_name: string
  event_key: string
  session_id: string
  occurred_at: string
  properties: Json
}

function mergeActiveMs(
  current: KfzAnalyticsRecord,
  incoming: KfzAnalyticsRecord,
): KfzAnalyticsRecord {
  const currentMs = current.properties.activeMs ?? 0
  const incomingMs = incoming.properties.activeMs ?? 0
  if (incomingMs <= currentMs && incoming.occurredAt <= current.occurredAt) {
    return {
      ...current,
      properties: lockKfzAnalyticsFirstTouchProperties(
        current.properties,
        current.properties,
      ),
    }
  }
  return {
    ...current,
    occurredAt:
      incoming.occurredAt > current.occurredAt ? incoming.occurredAt : current.occurredAt,
    properties: lockKfzAnalyticsFirstTouchProperties(current.properties, {
      ...current.properties,
      ...incoming.properties,
      activeMs: Math.max(currentMs, incomingMs),
    }),
  }
}

function rowToRecord(row: AnalyticsRow, nowIso: string): KfzAnalyticsRecord | null {
  return sanitizeKfzAnalyticsRecord(
    {
      eventName: row.event_name,
      eventKey: row.event_key,
      sessionId: row.session_id,
      occurredAt: row.occurred_at,
      properties: row.properties,
    },
    nowIso,
  )
}

export function createMemoryKfzAnalyticsStore(
  seed: KfzAnalyticsRecord[] = [],
): KfzAnalyticsStore & {
  events: KfzAnalyticsRecord[]
  health: KfzAnalyticsHealthSnapshot
} {
  const events = [...seed]
  const health: KfzAnalyticsHealthSnapshot = emptyKfzAnalyticsHealthSnapshot(false)

  return {
    events,
    health,
    async insertEvent(record) {
      const nowIso = record.occurredAt
      const sanitized = sanitizeKfzAnalyticsRecord(record, nowIso)
      if (!sanitized || !kfzAnalyticsRecordPassesPersistenceContract(sanitized)) {
        return { inserted: false, record }
      }
      const index = events.findIndex((entry) => entry.eventKey === sanitized.eventKey)
      if (index >= 0) {
        events[index] = mergeActiveMs(events[index]!, sanitized)
        return { inserted: false, record: events[index]! }
      }
      events.push(sanitized)
      return { inserted: true, record: sanitized }
    },
    async listEvents(input = {}) {
      return events.filter((event) => {
        if (input.from && event.occurredAt < input.from) {
          return false
        }
        if (input.to && event.occurredAt > input.to) {
          return false
        }
        return true
      })
    },
    async readHealthFacts() {
      return {
        available: health.available,
        facts: { ...health.facts },
      }
    },
    addHealthFacts(facts: KfzAnalyticsHealthFacts) {
      health.available = true
      health.facts = addKfzAnalyticsHealthFacts(health.facts, facts)
    },
  }
}

let previewStore = createMemoryKfzAnalyticsStore()

export function getKfzAnalyticsPreviewStore() {
  return previewStore
}

export function resetKfzAnalyticsPreviewStore() {
  previewStore = createMemoryKfzAnalyticsStore()
  return previewStore
}

async function insertWithClient(
  supabase: ReturnType<typeof createSupabaseJsClient<Database>>,
  agencyId: string,
  record: KfzAnalyticsRecord,
): Promise<{ inserted: boolean; record: KfzAnalyticsRecord }> {
  const sanitized = sanitizeKfzAnalyticsRecord(record, record.occurredAt)
  if (!sanitized || !kfzAnalyticsRecordPassesPersistenceContract(sanitized)) {
    return { inserted: false, record }
  }

  const { data: existing } = await supabase
    .from('kfz_funnel_analytics_events')
    .select('event_name, event_key, session_id, occurred_at, properties')
    .eq('agency_id', agencyId)
    .eq('event_key', sanitized.eventKey)
    .maybeSingle()

  if (existing) {
    const current = rowToRecord(existing as AnalyticsRow, sanitized.occurredAt)
    if (!current) {
      return { inserted: false, record: sanitized }
    }
    const merged = mergeActiveMs(current, sanitized)
    const nextMs = merged.properties.activeMs ?? 0
    const currentMs =
      current.properties.activeMs ?? 0
    if (nextMs > currentMs) {
      await supabase
        .from('kfz_funnel_analytics_events')
        .update({
          properties: merged.properties as Json,
          occurred_at: merged.occurredAt,
        })
        .eq('agency_id', agencyId)
        .eq('event_key', sanitized.eventKey)
    }
    return { inserted: false, record: merged }
  }

  const { error } = await supabase.from('kfz_funnel_analytics_events').insert({
    agency_id: agencyId,
    session_id: sanitized.sessionId,
    event_name: sanitized.eventName,
    event_key: sanitized.eventKey,
    occurred_at: sanitized.occurredAt,
    properties: sanitized.properties as Json,
  })

  if (error) {
    if (isKfzAnalyticsDuplicateKeyError(error)) {
      return { inserted: false, record: sanitized }
    }
    throw error
  }

  return { inserted: true, record: sanitized }
}

export function createServiceRoleKfzAnalyticsStore(agencyId: string): KfzAnalyticsStore {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Service-Role-Konfiguration fehlt.')
  }

  const supabase = createSupabaseJsClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return {
    async insertEvent(record) {
      return insertWithClient(supabase, agencyId, record)
    },
    async listEvents(input = {}) {
      let query = supabase
        .from('kfz_funnel_analytics_events')
        .select('event_name, event_key, session_id, occurred_at, properties')
        .eq('agency_id', agencyId)
        .order('occurred_at', { ascending: true })

      if (input.from) {
        query = query.gte('occurred_at', input.from)
      }
      if (input.to) {
        query = query.lte('occurred_at', input.to)
      }

      const { data, error } = await query
      if (error) {
        throw new Error('Kfz analytics store unavailable')
      }
      if (!data) {
        return []
      }
      const nowIso = new Date().toISOString()
      return data
        .map((row) => rowToRecord(row as AnalyticsRow, nowIso))
        .filter((row): row is KfzAnalyticsRecord => row !== null)
    },
    async readHealthFacts() {
      return emptyKfzAnalyticsHealthSnapshot(false)
    },
    addHealthFacts() {},
  }
}

export async function createAuthenticatedKfzAnalyticsStore(
  agencyId: string,
): Promise<KfzAnalyticsStore> {
  const supabase = await createClient()
  return {
    async insertEvent() {
      return { inserted: false, record: {
        eventName: 'landing_view',
        eventKey: 'blocked',
        sessionId: '00000000-0000-4000-8000-000000000000',
        occurredAt: new Date().toISOString(),
        properties: {},
      } }
    },
    async listEvents(input = {}) {
      let query = supabase
        .from('kfz_funnel_analytics_events')
        .select('event_name, event_key, session_id, occurred_at, properties')
        .eq('agency_id', agencyId)
        .order('occurred_at', { ascending: true })

      if (input.from) {
        query = query.gte('occurred_at', input.from)
      }
      if (input.to) {
        query = query.lte('occurred_at', input.to)
      }

      const { data, error } = await query
      if (error) {
        throw new Error('Kfz analytics store unavailable')
      }
      if (!data) {
        return []
      }
      const nowIso = new Date().toISOString()
      return data
        .map((row) => rowToRecord(row as AnalyticsRow, nowIso))
        .filter((row): row is KfzAnalyticsRecord => row !== null)
    },
    async readHealthFacts() {
      return emptyKfzAnalyticsHealthSnapshot(false)
    },
    addHealthFacts() {},
  }
}
