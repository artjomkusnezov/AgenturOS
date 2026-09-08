import { KFZ_ACQUISITION_PRODUCT } from '@/features/inbound/kfz/lib/build-kfz-inquiry-metadata'
import { MANUAL_CAPTURE_FAMILY } from '@/features/inbound/manual/lib/manual-capture-origin'
import { buildManualCaptureMetadata } from '@/features/inbound/manual/lib/manual-capture-origin'
import type { InboundItem } from '@/features/inbound/types/inbound-item'
import type { NormalizedManualCapture } from '@/features/inbound/manual/types/normalized-manual-capture'

/**
 * Reine Übersetzung: NormalizedManualCapture → InboundItem.
 * Keine Businesslogik, keine Kundensuche, kein KI-Aufruf, keine Promotion.
 * Ursprungstext bleibt unverändert; die gewählte Quelle liegt nur in Metadaten.
 * Kfz-Metadaten nur bei expliziter Mitarbeiterwahl.
 */
export function toInboundItemFromManualText(capture: NormalizedManualCapture): InboundItem {
  const sourceText = capture.sourceText.trim()
  const title = capture.title?.trim() || null
  const kfzCase = capture.kfzCase === true
  const captureMeta = buildManualCaptureMetadata(capture.originKind, {
    kfzCase,
  })

  const metadata: Record<string, unknown> = {
    ...captureMeta,
  }

  if (kfzCase && capture.kfzInquiry) {
    metadata.acquisition = {
      family: MANUAL_CAPTURE_FAMILY,
      product: KFZ_ACQUISITION_PRODUCT,
    }
    metadata.inquiry = capture.kfzInquiry
  }

  return {
    channel: 'manual',
    externalId: capture.externalId.trim(),
    sender: {
      displayName: capture.capturer.displayName?.trim() || null,
      address: capture.capturer.address?.trim() || null,
      addressKind: capture.capturer.addressKind ?? 'other',
    },
    origin: capture.origin
      ? {
          displayName: capture.origin.displayName?.trim() || null,
          address: capture.origin.address?.trim() || null,
          addressKind: capture.origin.addressKind ?? null,
        }
      : null,
    receivedAt: capture.capturedAt,
    title,
    content: sourceText,
    kind: 'text',
    metadata,
  }
}
