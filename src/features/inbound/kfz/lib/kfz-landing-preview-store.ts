/**
 * In-process memory store for the local /dev/kfz-landing submit seam.
 * Never used by production /kfz.
 */

import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

let previewStore = createMemoryInboundIntakeStore()

export function getKfzLandingPreviewStore() {
  return previewStore
}

export function resetKfzLandingPreviewStore() {
  previewStore = createMemoryInboundIntakeStore()
  return previewStore
}
