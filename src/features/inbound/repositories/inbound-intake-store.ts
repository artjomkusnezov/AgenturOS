import { FILES_STORAGE_BUCKET, buildStoragePath } from '@/features/files/lib/file-storage'
import {
  normalizeUploadFilename,
  resolveUploadMimeType,
} from '@/features/files/lib/validate-file'
import type { InboundIntakeStore } from '@/features/inbound/types/inbound-intake-store'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'

/**
 * Persistenz über den authentifizierten Server-Client.
 * Für spätere Quell-Webhooks: eigener Store mit service_role (nicht Foundation).
 *
 * user_id = actorUserId (Audit/RLS), nicht der Absender der Quelle.
 */
export function createSupabaseInboundIntakeStore(): InboundIntakeStore {
  return {
    async findByExternalIdentity({ agencyId, channel, externalId }) {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('inbox_items')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('channel', channel)
        .eq('external_id', externalId)
        .maybeSingle()

      if (error || !data) {
        return null
      }

      return data
    },

    async createInboxItem(input) {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('inbox_items')
        .insert({
          agency_id: input.agencyId,
          user_id: input.actorUserId,
          content: input.content,
          source: input.source,
          channel: input.channel,
          external_id: input.externalId,
          sender: input.sender as Json,
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
    },

    async uploadAndLinkAttachment({ actorUserId, inboxItemId, attachment }) {
      const supabase = await createClient()
      const filename = normalizeUploadFilename(attachment.filename)
      const mimeType =
        attachment.mimeType.trim().length > 0
          ? attachment.mimeType.trim()
          : resolveUploadMimeType(new File([], filename))
      const storagePath = buildStoragePath(actorUserId)
      const sizeBytes =
        typeof attachment.sizeBytes === 'number' && attachment.sizeBytes > 0
          ? attachment.sizeBytes
          : attachment.bytes.byteLength

      const { error: uploadError } = await supabase.storage
        .from(FILES_STORAGE_BUCKET)
        .upload(storagePath, attachment.bytes, {
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
          user_id: actorUserId,
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
        inbox_item_id: inboxItemId,
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
        source: input.source,
        channel: input.channel,
        external_id: input.externalId,
        sender: input.sender as Json,
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
      const fileId = crypto.randomUUID()
      void attachment
      links.push({ inboxItemId, fileId })
      return { success: true, fileId }
    },
  }
}
