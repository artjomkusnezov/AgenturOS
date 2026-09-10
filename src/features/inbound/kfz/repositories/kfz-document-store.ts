import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'

import { KFZ_INBOUND_DOCUMENTS_BUCKET } from '@/features/inbound/kfz/types/kfz-document-storage'
import type { KfzDocumentStore } from '@/features/inbound/kfz/types/kfz-document-storage'

type StoredObject = {
  bytes: ArrayBuffer
  mimeType: string
}

export function createMemoryKfzDocumentStore(
  seed: Record<string, StoredObject> = {},
): KfzDocumentStore & {
  objects: Map<string, StoredObject>
  removed: string[]
} {
  const objects = new Map<string, StoredObject>(Object.entries(seed))
  const removed: string[] = []

  return {
    objects,
    removed,
    async putObject({ objectKey, bytes, mimeType }) {
      objects.set(objectKey, { bytes, mimeType })
      return { ok: true }
    },
    async removeObjects(objectKeys) {
      for (const key of objectKeys) {
        objects.delete(key)
        removed.push(key)
      }
    },
    async getObject(objectKey) {
      const found = objects.get(objectKey)
      if (!found) {
        return { ok: false }
      }
      return { ok: true, bytes: found.bytes, mimeType: found.mimeType }
    },
  }
}

/**
 * Server-side private bucket access via service_role.
 * Never expose the key. No public URLs. No client policies required.
 */
export function createServiceRoleKfzDocumentStore(): KfzDocumentStore {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Service-Role-Konfiguration fehlt.')
  }

  const supabase = createSupabaseJsClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return {
    async putObject({ objectKey, bytes, mimeType }) {
      const { error } = await supabase.storage
        .from(KFZ_INBOUND_DOCUMENTS_BUCKET)
        .upload(objectKey, bytes, {
          contentType: mimeType,
          upsert: false,
        })
      if (error) {
        return { ok: false, error: 'Die Datei konnte nicht hochgeladen werden.' }
      }
      return { ok: true }
    },
    async removeObjects(objectKeys) {
      if (objectKeys.length === 0) {
        return
      }
      await supabase.storage.from(KFZ_INBOUND_DOCUMENTS_BUCKET).remove([...objectKeys])
    },
    async getObject(objectKey) {
      const { data, error } = await supabase.storage
        .from(KFZ_INBOUND_DOCUMENTS_BUCKET)
        .download(objectKey)
      if (error || !data) {
        return { ok: false }
      }
      return {
        ok: true,
        bytes: await data.arrayBuffer(),
        mimeType: data.type || 'application/octet-stream',
      }
    },
  }
}
