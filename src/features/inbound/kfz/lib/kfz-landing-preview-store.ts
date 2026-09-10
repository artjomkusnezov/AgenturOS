/**
 * In-process memory store for the local /dev/kfz-landing submit seam.
 * Never used by production /kfz.
 */

import { createMemoryKfzDocumentStore } from '@/features/inbound/kfz/repositories/kfz-document-store'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

let previewStore = createMemoryInboundIntakeStore()
let previewDocuments = createMemoryKfzDocumentStore()

export function getKfzLandingPreviewStore() {
  return previewStore
}

export function getKfzLandingPreviewDocumentStore() {
  return previewDocuments
}

export function resetKfzLandingPreviewStore() {
  previewStore = createMemoryInboundIntakeStore()
  previewDocuments = createMemoryKfzDocumentStore()
  return previewStore
}
