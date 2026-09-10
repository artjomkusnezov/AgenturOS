/**
 * In-process memory store for the local /dev/kfz-landing submit seam.
 * Never used by production /kfz.
 *
 * Held on globalThis so the server-action module and /dev/kfz-document route
 * share the same bytes across Next.js HMR / module copies.
 */

import { createMemoryKfzDocumentStore } from '@/features/inbound/kfz/repositories/kfz-document-store'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

type PreviewIntakeStore = ReturnType<typeof createMemoryInboundIntakeStore>
type PreviewDocumentStore = ReturnType<typeof createMemoryKfzDocumentStore>

type KfzLandingPreviewGlobals = typeof globalThis & {
  __kfzLandingPreviewStore?: PreviewIntakeStore
  __kfzLandingPreviewDocuments?: PreviewDocumentStore
}

function previewGlobals(): KfzLandingPreviewGlobals {
  return globalThis as KfzLandingPreviewGlobals
}

export function getKfzLandingPreviewStore() {
  const globals = previewGlobals()
  if (!globals.__kfzLandingPreviewStore) {
    globals.__kfzLandingPreviewStore = createMemoryInboundIntakeStore()
  }
  return globals.__kfzLandingPreviewStore
}

export function getKfzLandingPreviewDocumentStore() {
  const globals = previewGlobals()
  if (!globals.__kfzLandingPreviewDocuments) {
    globals.__kfzLandingPreviewDocuments = createMemoryKfzDocumentStore()
  }
  return globals.__kfzLandingPreviewDocuments
}

export function resetKfzLandingPreviewStore() {
  const globals = previewGlobals()
  globals.__kfzLandingPreviewStore = createMemoryInboundIntakeStore()
  globals.__kfzLandingPreviewDocuments = createMemoryKfzDocumentStore()
  return globals.__kfzLandingPreviewStore
}
