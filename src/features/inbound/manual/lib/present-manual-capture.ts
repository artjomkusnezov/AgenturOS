import type { InboundSender } from '@/features/inbound/types/inbound-item'
import {
  MANUAL_CAPTURE_CHANNEL_LABEL,
  MANUAL_CAPTURE_CHANNEL_VALUE,
  MANUAL_CAPTURE_CONFIRM_LABEL,
  MANUAL_CAPTURE_DUPLICATE_CREATE_ANYWAY_LABEL,
  MANUAL_CAPTURE_DUPLICATE_DECISION_HINT,
  MANUAL_CAPTURE_DUPLICATE_OPEN_LABEL,
  MANUAL_CAPTURE_DUPLICATE_REASON_CONTACT,
  MANUAL_CAPTURE_DUPLICATE_REASON_RECENT_TITLE,
  MANUAL_CAPTURE_DUPLICATE_REASON_SOURCE_TEXT,
  MANUAL_CAPTURE_DUPLICATE_WARNING,
  MANUAL_CAPTURE_FIELDS_HEADING,
  MANUAL_CAPTURE_KFZ_CASE_LABEL,
  MANUAL_CAPTURE_KFZ_CITY_LABEL,
  MANUAL_CAPTURE_KFZ_CLASSIFICATION_VALUE,
  MANUAL_CAPTURE_KFZ_CUSTOMER_LABEL,
  MANUAL_CAPTURE_KFZ_EMAIL_LABEL,
  MANUAL_CAPTURE_KFZ_FIELDS_HEADING,
  MANUAL_CAPTURE_KFZ_MISSING_HEADING,
  MANUAL_CAPTURE_KFZ_PHONE_LABEL,
  MANUAL_CAPTURE_KFZ_POSTAL_CODE_LABEL,
  MANUAL_CAPTURE_KFZ_PREFERRED_CHANNEL_LABEL,
  MANUAL_CAPTURE_KFZ_REASON_LABEL,
  MANUAL_CAPTURE_KFZ_VEHICLE_MAKE_LABEL,
  MANUAL_CAPTURE_KFZ_VEHICLE_MODEL_LABEL,
  MANUAL_CAPTURE_KFZ_VEHICLE_YEAR_LABEL,
  MANUAL_CAPTURE_KIND_LABEL,
  MANUAL_CAPTURE_KIND_VALUE,
  MANUAL_CAPTURE_NO_AUTO_ACTION,
  MANUAL_CAPTURE_ORIGIN_ADDRESS_LABEL,
  MANUAL_CAPTURE_ORIGIN_KIND_LABEL,
  MANUAL_CAPTURE_ORIGIN_NAME_LABEL,
  MANUAL_CAPTURE_SENDER_LABEL,
  MANUAL_CAPTURE_SENDER_VALUE,
  MANUAL_CAPTURE_SOURCE_LABEL,
  MANUAL_CAPTURE_TITLE_LABEL,
  MANUAL_FIELD_SUGGESTION_LABEL,
} from '@/features/inbound/manual/lib/manual-capture-copy'
import type {
  ManualCaptureDuplicateMatch,
  ManualCaptureDuplicateReason,
} from '@/features/inbound/manual/lib/find-likely-manual-capture-duplicate'
import { getManualCaptureOriginKindLabel } from '@/features/inbound/manual/lib/manual-capture-origin'
import type { ManualCaptureDraft } from '@/features/inbound/manual/lib/build-manual-capture-draft'
import type { ManualKfzFactField } from '@/features/inbound/manual/lib/suggest-manual-kfz-facts'
import {
  buildKfzMissingInformationChecklist,
  labelKfzMissingCount,
  type KfzMissingInfoCheck,
} from '@/features/inbox/lib/present-kfz-website-inbox'

export type ManualCaptureProposedFieldId =
  | 'originKind'
  | 'channel'
  | 'kind'
  | 'title'
  | 'originName'
  | 'originAddress'
  | 'sender'

export type ManualKfzReviewFieldId = ManualKfzFactField

export type ManualKfzReviewField = {
  id: ManualKfzReviewFieldId
  name: string
  label: string
  value: string
  editable: boolean
  suggestion: boolean
  suggestionLabel: typeof MANUAL_FIELD_SUGGESTION_LABEL | null
}

export type ManualCaptureKfzReview = {
  chosen: true
  classification: typeof MANUAL_CAPTURE_KFZ_CLASSIFICATION_VALUE
  caseLabel: typeof MANUAL_CAPTURE_KFZ_CASE_LABEL
  fieldsHeading: typeof MANUAL_CAPTURE_KFZ_FIELDS_HEADING
  missingHeading: typeof MANUAL_CAPTURE_KFZ_MISSING_HEADING
  fields: ManualKfzReviewField[]
  missingInformationChecklist: KfzMissingInfoCheck[]
  missingInformation: string[]
  missingCount: number
  missingCountLabel: string
}

export type ManualCaptureDraftReview = {
  sourceHeading: typeof MANUAL_CAPTURE_SOURCE_LABEL
  sourceText: string
  fieldsHeading: typeof MANUAL_CAPTURE_FIELDS_HEADING
  fields: ManualCaptureProposedField[]
  kfz: ManualCaptureKfzReview | null
  confirmLabel: typeof MANUAL_CAPTURE_CONFIRM_LABEL
  noAutoAction: typeof MANUAL_CAPTURE_NO_AUTO_ACTION
  requiresConfirmation: true
}

export type ManualCaptureProposedField = {
  id: ManualCaptureProposedFieldId
  label: string
  value: string
  editable: boolean
  suggestion: boolean
  suggestionLabel: typeof MANUAL_FIELD_SUGGESTION_LABEL | null
}

function kfzSuggestionLabelFor(
  draft: ManualCaptureDraft,
  field: ManualKfzFactField,
  value: string,
): typeof MANUAL_FIELD_SUGGESTION_LABEL | null {
  if (!value || !draft.kfzFacts) {
    return null
  }

  return draft.kfzFacts.items.some((entry) => entry.field === field && entry.value === value)
    ? MANUAL_FIELD_SUGGESTION_LABEL
    : null
}

function preferredChannelLabel(channel: string | null): string {
  if (channel === 'phone') {
    return 'Telefon'
  }
  if (channel === 'email') {
    return 'E-Mail'
  }
  if (channel === 'whatsapp') {
    return 'WhatsApp'
  }
  return ''
}

function presentManualKfzReview(draft: ManualCaptureDraft): ManualCaptureKfzReview | null {
  if (!draft.kfzCase || !draft.kfzFacts) {
    return null
  }

  const facts = draft.kfzFacts
  const vehicleLabel =
    [facts.vehicleMake, facts.vehicleModel, facts.vehicleYear].filter(Boolean).join(' ') || null
  const locationLabel = [facts.postalCode, facts.city].filter(Boolean).join(' ') || null
  const missingInformationChecklist = buildKfzMissingInformationChecklist({
    phone: facts.phone,
    email: facts.email,
    preferredChannel: facts.preferredChannel,
    reason: facts.inquiryReason,
    vehicle: vehicleLabel,
    location: locationLabel,
  })
  const missingInformation = missingInformationChecklist
    .filter((item) => !item.present)
    .map((item) => item.label)

  const field = (
    id: ManualKfzFactField,
    name: string,
    label: string,
    value: string | null,
    editable = true,
  ): ManualKfzReviewField => {
    const text = value?.trim() ?? ''
    const suggestionSource = id === 'preferredChannel' ? (value ?? '') : text
    const suggestionLabel = kfzSuggestionLabelFor(draft, id, suggestionSource)
    return {
      id,
      name,
      label,
      value: id === 'preferredChannel' ? preferredChannelLabel(text || null) : text,
      editable,
      suggestion: Boolean(suggestionLabel),
      suggestionLabel,
    }
  }

  return {
    chosen: true,
    classification: MANUAL_CAPTURE_KFZ_CLASSIFICATION_VALUE,
    caseLabel: MANUAL_CAPTURE_KFZ_CASE_LABEL,
    fieldsHeading: MANUAL_CAPTURE_KFZ_FIELDS_HEADING,
    missingHeading: MANUAL_CAPTURE_KFZ_MISSING_HEADING,
    fields: [
      field('fullName', 'kfzFullName', MANUAL_CAPTURE_KFZ_CUSTOMER_LABEL, facts.fullName),
      field('phone', 'kfzPhone', MANUAL_CAPTURE_KFZ_PHONE_LABEL, facts.phone),
      field('email', 'kfzEmail', MANUAL_CAPTURE_KFZ_EMAIL_LABEL, facts.email),
      field('postalCode', 'kfzPostalCode', MANUAL_CAPTURE_KFZ_POSTAL_CODE_LABEL, facts.postalCode),
      field('city', 'kfzCity', MANUAL_CAPTURE_KFZ_CITY_LABEL, facts.city),
      field(
        'preferredChannel',
        'kfzPreferredChannel',
        MANUAL_CAPTURE_KFZ_PREFERRED_CHANNEL_LABEL,
        facts.preferredChannel,
        false,
      ),
      field('inquiryReason', 'kfzInquiryReason', MANUAL_CAPTURE_KFZ_REASON_LABEL, facts.inquiryReason),
      field('vehicleMake', 'kfzVehicleMake', MANUAL_CAPTURE_KFZ_VEHICLE_MAKE_LABEL, facts.vehicleMake),
      field(
        'vehicleModel',
        'kfzVehicleModel',
        MANUAL_CAPTURE_KFZ_VEHICLE_MODEL_LABEL,
        facts.vehicleModel,
      ),
      field('vehicleYear', 'kfzVehicleYear', MANUAL_CAPTURE_KFZ_VEHICLE_YEAR_LABEL, facts.vehicleYear),
    ],
    missingInformationChecklist,
    missingInformation,
    missingCount: missingInformation.length,
    missingCountLabel: labelKfzMissingCount(missingInformation.length),
  }
}

function suggestionLabelFor(
  draft: ManualCaptureDraft,
  field: string,
  value: string,
): typeof MANUAL_FIELD_SUGGESTION_LABEL | null {
  if (!value) {
    return null
  }

  return draft.suggestions.some((entry) => entry.field === field && entry.value === value)
    ? MANUAL_FIELD_SUGGESTION_LABEL
    : null
}

/**
 * Operator-facing review of a manual inbound draft.
 * Source text stays visible; suggested fields stay labeled.
 */
export function presentManualCaptureDraft(draft: ManualCaptureDraft): ManualCaptureDraftReview {
  const originName = draft.proposed.origin?.displayName?.trim() ?? ''
  const originAddress = draft.proposed.origin?.address?.trim() ?? ''
  const title = draft.proposed.title?.trim() ?? ''
  const sender =
    draft.proposed.sender.displayName?.trim() || MANUAL_CAPTURE_SENDER_VALUE

  const titleSuggestion = suggestionLabelFor(draft, 'title', title)
  const originNameSuggestion = suggestionLabelFor(draft, 'origin.displayName', originName)
  const originAddressSuggestion = suggestionLabelFor(draft, 'origin.address', originAddress)

  return {
    sourceHeading: MANUAL_CAPTURE_SOURCE_LABEL,
    sourceText: draft.sourceText,
    fieldsHeading: MANUAL_CAPTURE_FIELDS_HEADING,
    fields: [
      {
        id: 'originKind',
        label: MANUAL_CAPTURE_ORIGIN_KIND_LABEL,
        value: getManualCaptureOriginKindLabel(draft.originKind),
        editable: false,
        suggestion: false,
        suggestionLabel: null,
      },
      {
        id: 'channel',
        label: MANUAL_CAPTURE_CHANNEL_LABEL,
        value: MANUAL_CAPTURE_CHANNEL_VALUE,
        editable: false,
        suggestion: false,
        suggestionLabel: null,
      },
      {
        id: 'kind',
        label: MANUAL_CAPTURE_KIND_LABEL,
        value: MANUAL_CAPTURE_KIND_VALUE,
        editable: false,
        suggestion: false,
        suggestionLabel: null,
      },
      {
        id: 'title',
        label: MANUAL_CAPTURE_TITLE_LABEL,
        value: title,
        editable: true,
        suggestion: Boolean(titleSuggestion),
        suggestionLabel: titleSuggestion,
      },
      {
        id: 'originName',
        label: MANUAL_CAPTURE_ORIGIN_NAME_LABEL,
        value: originName,
        editable: true,
        suggestion: Boolean(originNameSuggestion),
        suggestionLabel: originNameSuggestion,
      },
      {
        id: 'originAddress',
        label: MANUAL_CAPTURE_ORIGIN_ADDRESS_LABEL,
        value: originAddress,
        editable: true,
        suggestion: Boolean(originAddressSuggestion),
        suggestionLabel: originAddressSuggestion,
      },
      {
        id: 'sender',
        label: MANUAL_CAPTURE_SENDER_LABEL,
        value: sender,
        editable: false,
        suggestion: false,
        suggestionLabel: null,
      },
    ],
    kfz: presentManualKfzReview(draft),
    confirmLabel: MANUAL_CAPTURE_CONFIRM_LABEL,
    noAutoAction: MANUAL_CAPTURE_NO_AUTO_ACTION,
    requiresConfirmation: true,
  }
}

export type ManualCaptureDuplicateWarningView = {
  itemId: string
  title: string
  href: string
  reason: ManualCaptureDuplicateReason
  reasonLabel: string
  warning: typeof MANUAL_CAPTURE_DUPLICATE_WARNING
  decisionHint: typeof MANUAL_CAPTURE_DUPLICATE_DECISION_HINT
  openLabel: typeof MANUAL_CAPTURE_DUPLICATE_OPEN_LABEL
  createAnywayLabel: typeof MANUAL_CAPTURE_DUPLICATE_CREATE_ANYWAY_LABEL
  blocksAutomatically: false
}

const DUPLICATE_REASON_LABELS: Record<
  ManualCaptureDuplicateReason,
  | typeof MANUAL_CAPTURE_DUPLICATE_REASON_SOURCE_TEXT
  | typeof MANUAL_CAPTURE_DUPLICATE_REASON_CONTACT
  | typeof MANUAL_CAPTURE_DUPLICATE_REASON_RECENT_TITLE
> = {
  source_text: MANUAL_CAPTURE_DUPLICATE_REASON_SOURCE_TEXT,
  contact: MANUAL_CAPTURE_DUPLICATE_REASON_CONTACT,
  recent_title: MANUAL_CAPTURE_DUPLICATE_REASON_RECENT_TITLE,
}

/**
 * Operator-facing duplicate warning. Never a block and never a merge.
 */
export function presentManualCaptureDuplicateWarning(
  match: ManualCaptureDuplicateMatch,
  href: string,
): ManualCaptureDuplicateWarningView {
  return {
    itemId: match.itemId,
    title: match.title,
    href,
    reason: match.reason,
    reasonLabel: DUPLICATE_REASON_LABELS[match.reason],
    warning: MANUAL_CAPTURE_DUPLICATE_WARNING,
    decisionHint: MANUAL_CAPTURE_DUPLICATE_DECISION_HINT,
    openLabel: MANUAL_CAPTURE_DUPLICATE_OPEN_LABEL,
    createAnywayLabel: MANUAL_CAPTURE_DUPLICATE_CREATE_ANYWAY_LABEL,
    blocksAutomatically: false,
  }
}

export function originFromReviewFields(input: {
  displayName: string
  address: string
  addressKind?: InboundSender['addressKind']
}): InboundSender | null {
  const displayName = input.displayName.trim() || null
  const address = input.address.trim() || null

  if (!displayName && !address) {
    return null
  }

  let addressKind = input.addressKind ?? null
  if (!addressKind && address) {
    addressKind = address.includes('@') ? 'email' : 'other'
  }

  return {
    displayName,
    address,
    addressKind,
  }
}
