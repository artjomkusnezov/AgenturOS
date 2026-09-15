/**
 * Shared operator-facing inquiry metadata for the Kfz review card.
 * Adapter translation only — no consent, no inbox writes, no AI.
 */

import type { PublicKfzQuestionnaire } from '@/features/inbound/kfz/types/public-kfz-inquiry'

export const KFZ_ACQUISITION_PRODUCT = 'kfz' as const

export type KfzInquiryMetadata = {
  reason: string | null
  preferredChannel: string | null
  language: string | null
  location: {
    postalCode: string | null
    city: string | null
  }
  vehicle: {
    make: string | null
    model: string | null
    year: string | null
  }
  contextNotes: string | null
  phone: string | null
  email: string | null
  fullName?: string | null
  questionnaire?: PublicKfzQuestionnaire | null
}

export type BuildKfzInquiryMetadataInput = {
  reason: string | null
  preferredChannel: string | null
  language?: string | null
  postalCode: string | null
  city: string | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleYear: string | null
  contextNotes: string | null
  phone: string | null
  email: string | null
  fullName?: string | null
  questionnaire?: PublicKfzQuestionnaire | null
}

/**
 * Builds the persisted `inquiry` object that `presentKfzWebsiteInboxItem` already reads.
 */
export function buildKfzInquiryMetadata(
  input: BuildKfzInquiryMetadataInput,
): KfzInquiryMetadata {
  const inquiry: KfzInquiryMetadata = {
    reason: input.reason,
    preferredChannel: input.preferredChannel,
    language: input.language ?? null,
    location: {
      postalCode: input.postalCode,
      city: input.city,
    },
    vehicle: {
      make: input.vehicleMake,
      model: input.vehicleModel,
      year: input.vehicleYear,
    },
    contextNotes: input.contextNotes,
    phone: input.phone,
    email: input.email,
  }

  if (input.questionnaire) {
    inquiry.questionnaire = input.questionnaire
  }

  const fullName = input.fullName?.trim() || null
  if (fullName) {
    inquiry.fullName = fullName
  }

  return inquiry
}
