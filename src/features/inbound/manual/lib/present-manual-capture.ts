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

export type ManualCaptureProposedFieldId =
  | 'originKind'
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
