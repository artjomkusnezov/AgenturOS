import type { InboundSender } from '@/features/inbound/types/inbound-item'
import {
  MANUAL_CAPTURE_CHANNEL_LABEL,
  MANUAL_CAPTURE_CHANNEL_VALUE,
  MANUAL_CAPTURE_CONFIRM_LABEL,
  MANUAL_CAPTURE_FIELDS_HEADING,
  MANUAL_CAPTURE_KIND_LABEL,
  MANUAL_CAPTURE_KIND_VALUE,
  MANUAL_CAPTURE_NO_AUTO_ACTION,
  MANUAL_CAPTURE_ORIGIN_ADDRESS_LABEL,
  MANUAL_CAPTURE_ORIGIN_NAME_LABEL,
  MANUAL_CAPTURE_SENDER_LABEL,
  MANUAL_CAPTURE_SENDER_VALUE,
  MANUAL_CAPTURE_SOURCE_LABEL,
  MANUAL_CAPTURE_TITLE_LABEL,
  MANUAL_FIELD_SUGGESTION_LABEL,
} from '@/features/inbound/manual/lib/manual-capture-copy'
import type { ManualCaptureDraft } from '@/features/inbound/manual/lib/build-manual-capture-draft'

export type ManualCaptureProposedFieldId =
  | 'channel'
  | 'kind'
  | 'title'
  | 'originName'
  | 'originAddress'
  | 'sender'

export type ManualCaptureProposedField = {
  id: ManualCaptureProposedFieldId
  label: string
  value: string
  editable: boolean
  suggestion: boolean
  suggestionLabel: typeof MANUAL_FIELD_SUGGESTION_LABEL | null
}

export type ManualCaptureDraftReview = {
  sourceHeading: typeof MANUAL_CAPTURE_SOURCE_LABEL
  sourceText: string
  fieldsHeading: typeof MANUAL_CAPTURE_FIELDS_HEADING
  fields: ManualCaptureProposedField[]
  confirmLabel: typeof MANUAL_CAPTURE_CONFIRM_LABEL
  noAutoAction: typeof MANUAL_CAPTURE_NO_AUTO_ACTION
  requiresConfirmation: true
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
    confirmLabel: MANUAL_CAPTURE_CONFIRM_LABEL,
    noAutoAction: MANUAL_CAPTURE_NO_AUTO_ACTION,
    requiresConfirmation: true,
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
