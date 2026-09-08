/**
 * Sanitize employee-reviewed Kfz suggestions into the existing inquiry metadata shape.
 * Incomplete facts stay missing — no website consent requirement, no invented values.
 */

import {
  buildKfzInquiryMetadata,
  type KfzInquiryMetadata,
} from '@/features/inbound/kfz/lib/build-kfz-inquiry-metadata'
import { normalizeInternationalPhone } from '@/features/inbound/kfz/lib/normalize-phone'
import { sanitizePlainTextField } from '@/features/inbound/kfz/lib/sanitize-plain-text'
import { KFZ_PUBLIC_LIMITS } from '@/features/inbound/kfz/types/public-kfz-inquiry'
import { isKfzPreferredChannel } from '@/features/inbound/manual/lib/suggest-manual-kfz-facts'

export type ManualKfzInquiryInput = {
  fullName?: string | null
  phone?: string | null
  email?: string | null
  postalCode?: string | null
  city?: string | null
  preferredChannel?: string | null
  inquiryReason?: string | null
  vehicleMake?: string | null
  vehicleModel?: string | null
  vehicleYear?: string | null
  contextNotes?: string | null
}

function optionalField(raw: string | null | undefined, maxLen: number): string | null {
  if (raw == null) {
    return null
  }

  const sanitized = sanitizePlainTextField(raw, maxLen)
  return sanitized.length > 0 ? sanitized : null
}

function normalizePhoneField(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? ''
  if (!trimmed) {
    return null
  }

  return normalizeInternationalPhone(trimmed) ?? optionalField(trimmed, KFZ_PUBLIC_LIMITS.phone)
}

function normalizeEmailField(raw: string | null | undefined): string | null {
  const sanitized = optionalField(raw, KFZ_PUBLIC_LIMITS.email)
  return sanitized ? sanitized.toLowerCase() : null
}

/**
 * Maps reviewed Kfz suggestions onto the same inquiry metadata the website adapter writes.
 */
export function normalizeManualKfzInquiry(input: ManualKfzInquiryInput): KfzInquiryMetadata {
  const preferredChannel = isKfzPreferredChannel(input.preferredChannel)
    ? input.preferredChannel
    : null

  return buildKfzInquiryMetadata({
    reason: optionalField(input.inquiryReason, KFZ_PUBLIC_LIMITS.inquiryReason),
    preferredChannel,
    language: null,
    postalCode: optionalField(input.postalCode, KFZ_PUBLIC_LIMITS.postalCode),
    city: optionalField(input.city, KFZ_PUBLIC_LIMITS.city),
    vehicleMake: optionalField(input.vehicleMake, KFZ_PUBLIC_LIMITS.vehicleMake),
    vehicleModel: optionalField(input.vehicleModel, KFZ_PUBLIC_LIMITS.vehicleModel),
    vehicleYear: optionalField(
      input.vehicleYear == null ? null : String(input.vehicleYear),
      KFZ_PUBLIC_LIMITS.vehicleYear,
    ),
    contextNotes: optionalField(input.contextNotes, KFZ_PUBLIC_LIMITS.contextNotes),
    phone: normalizePhoneField(input.phone),
    email: normalizeEmailField(input.email),
    fullName: optionalField(input.fullName, KFZ_PUBLIC_LIMITS.fullName),
  })
}
