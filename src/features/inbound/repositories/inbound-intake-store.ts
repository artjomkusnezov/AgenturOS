import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'

import { FILES_STORAGE_BUCKET, buildStoragePath, MAX_FILE_UPLOAD_BYTES } from '@/features/files/lib/file-storage'
import {
  normalizeUploadFilename,
  resolveUploadMimeType,
} from '@/features/files/lib/validate-file'
import type { InboundIntakeStore } from '@/features/inbound/types/inbound-intake-store'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { createClient } from '@/lib/supabase/server'
import type { Database, Json } from '@/lib/supabase/types'

type SupabaseDb = ReturnType<typeof createSupabaseJsClient<Database>>

async function findByExternalIdentityWithClient(
  supabase: SupabaseDb | Awaited<ReturnType<typeof createClient>>,
  input: { agencyId: string; channel: string; externalId: string },
): Promise<InboxItem | null> {
  const { data, error } = await supabase
    .from('inbox_items')
    .select('*')
    .eq('agency_id', input.agencyId)
    .eq('channel', input.channel)
    .eq('external_id', input.externalId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data
}

async function createInboxItemWithClient(
  supabase: SupabaseDb | Awaited<ReturnType<typeof createClient>>,
  input: Parameters<InboundIntakeStore['createInboxItem']>[0],
): Promise<InboxItem> {
  const { data, error } = await supabase
    .from('inbox_items')
    .insert({
      agency_id: input.agencyId,
      user_id: input.actorUserId,
      content: input.content,
      title: input.title,
      source: input.source,
      channel: input.channel,
      external_id: input.externalId,
      sender: input.sender as Json,
      origin: input.origin as Json | null,
      received_at: input.receivedAt,
      message_kind: input.itemKind,
      inbound_metadata: input.metadata as Json,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'inbox insert failed')
  }

  return data
}

async function uploadAndLinkAttachmentWithClient(
  supabase: SupabaseDb | Awaited<ReturnType<typeof createClient>>,
  input: Parameters<InboundIntakeStore['uploadAndLinkAttachment']>[0],
): Promise<{ success: true; fileId: string } | { success: false; error: string }> {
  const filename = normalizeUploadFilename(input.attachment.filename)
  const mimeType =
    input.attachment.mimeType.trim().length > 0
      ? input.attachment.mimeType.trim()
      : resolveUploadMimeType(new File([], filename))
  const storagePath = buildStoragePath(input.actorUserId)
  const sizeBytes =
    typeof input.attachment.sizeBytes === 'number' && input.attachment.sizeBytes > 0
      ? input.attachment.sizeBytes
      : input.attachment.bytes.byteLength

  if (sizeBytes > MAX_FILE_UPLOAD_BYTES) {
    return {
      success: false,
      error: 'Die Datei überschreitet die erlaubte Größe.',
    }
  }

  const { error: uploadError } = await supabase.storage
    .from(FILES_STORAGE_BUCKET)
    .upload(storagePath, input.attachment.bytes, {
      contentType: mimeType,
      upsert: false,
    })

  if (uploadError) {
    return {
      success: false,
      error: 'Die Datei konnte nicht hochgeladen werden.',
    }
  }

  const { data: fileRow, error: fileError } = await supabase
    .from('files')
    .insert({
      user_id: input.actorUserId,
      filename,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    })
    .select('id')
    .single()

  if (fileError || !fileRow) {
    await supabase.storage.from(FILES_STORAGE_BUCKET).remove([storagePath])
    return {
      success: false,
      error: 'Die Datei konnte nicht gespeichert werden.',
    }
  }

  const { error: linkError } = await supabase.from('inbox_item_files').insert({
    inbox_item_id: input.inboxItemId,
    file_id: fileRow.id,
  })

  if (linkError) {
    await supabase.from('files').delete().eq('id', fileRow.id)
    await supabase.storage.from(FILES_STORAGE_BUCKET).remove([storagePath])
    return {
      success: false,
      error: 'Die Datei konnte dem Eingang nicht zugeordnet werden.',
    }
  }

  return {
    success: true,
    fileId: fileRow.id,
  }
}

/**
 * Persistenz über den authentifizierten Server-Client (User-Session).
 * user_id = actorUserId (Audit), nicht der Absender der Quelle.
 */
export function createSupabaseInboundIntakeStore(): InboundIntakeStore {
  return {
    async findByExternalIdentity(input) {
      const supabase = await createClient()
      return findByExternalIdentityWithClient(supabase, input)
    },
    async createInboxItem(input) {
      const supabase = await createClient()
      return createInboxItemWithClient(supabase, input)
    },
    async uploadAndLinkAttachment(input) {
      const supabase = await createClient()
      return uploadAndLinkAttachmentWithClient(supabase, input)
    },
  }
}

/**
 * Webhook-/System-Intake ohne User-Session.
 * Nutzt service_role (bypasst RLS), validiert aber Actor-Membership aktiv.
 * Secrets nur serverseitig (SUPABASE_SERVICE_ROLE_KEY).
 */
export function createServiceRoleInboundIntakeStore(): InboundIntakeStore {
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
    async findByExternalIdentity(input) {
      return findByExternalIdentityWithClient(supabase, input)
    },
    async createInboxItem(input) {
      const { data: membership, error: membershipError } = await supabase
        .from('agency_memberships')
        .select('id')
        .eq('agency_id', input.agencyId)
        .eq('user_id', input.actorUserId)
        .eq('status', 'active')
        .maybeSingle()

      if (membershipError || !membership) {
        throw new Error('Audit-Akteur ist kein aktives Agenturmitglied.')
      }

      return createInboxItemWithClient(supabase, input)
    },
    async uploadAndLinkAttachment(input) {
      return uploadAndLinkAttachmentWithClient(supabase, input)
    },
  }
}

export function createMemoryInboundIntakeStore(
  seed: InboxItem[] = [],
): InboundIntakeStore & { items: InboxItem[]; links: Array<{ inboxItemId: string; fileId: string }> } {
  const items = [...seed]
  const links: Array<{ inboxItemId: string; fileId: string }> = []

  return {
    items,
    links,
    async findByExternalIdentity({ agencyId, channel, externalId }) {
      return (
        items.find(
          (entry) =>
            entry.agency_id === agencyId &&
            entry.channel === channel &&
            entry.external_id === externalId,
        ) ?? null
      )
    },
    async createInboxItem(input) {
      const now = new Date().toISOString()
      const item = {
        id: crypto.randomUUID(),
        agency_id: input.agencyId,
        user_id: input.actorUserId,
        content: input.content,
        title: input.title,
        source: input.source,
        channel: input.channel,
        external_id: input.externalId,
        sender: input.sender as Json,
        origin: input.origin as Json | null,
        received_at: input.receivedAt,
        message_kind: input.itemKind,
        inbound_metadata: input.metadata as Json,
        processed_at: null,
        created_at: now,
        updated_at: now,
        transcription_status: 'none',
        transcript_text: null,
        transcription_error: null,
        transcription_model: null,
        transcription_provider: null,
        transcription_started_at: null,
        transcription_completed_at: null,
        detected_language: null,
      } satisfies InboxItem

      const duplicate = items.find(
        (entry) =>
          entry.agency_id === input.agencyId &&
          entry.channel === input.channel &&
          entry.external_id === input.externalId,
      )

      if (duplicate) {
        throw new Error('inbox_items_agency_channel_external_id_uidx')
      }

      items.push(item)
      return item
    },
    async uploadAndLinkAttachment({ inboxItemId, attachment }) {
      if (attachment.bytes.byteLength > MAX_FILE_UPLOAD_BYTES) {
        return {
          success: false,
          error: 'Die Datei überschreitet die erlaubte Größe.',
        }
      }

      const fileId = crypto.randomUUID()
      links.push({ inboxItemId, fileId })
      return { success: true, fileId }
    },
  }
}
