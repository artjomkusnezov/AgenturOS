/**
 * Provider-neutral inbound analysis contract.
 *
 * Downstream of normalized intake. Advisory only — never mutates cases,
 * tasks, contacts, or inbox items. Humans remain responsible for decisions.
 *
 * Confidence range: 0..1 inclusive (0 = no confidence, 1 = maximum).
 */

export const INBOUND_ANALYSIS_INTENTS = [
  'service',
  'claim',
  'new_business',
  'unclear',
] as const

export type InboundAnalysisIntent = (typeof INBOUND_ANALYSIS_INTENTS)[number]

export const INBOUND_ANALYSIS_URGENCIES = [
  'low',
  'normal',
  'high',
  'immediate',
] as const

export type InboundAnalysisUrgency = (typeof INBOUND_ANALYSIS_URGENCIES)[number]

export const INBOUND_ANALYSIS_PURCHASE_INTENTS = [
  'none',
  'possible',
  'strong',
  'unclear',
] as const

export type InboundAnalysisPurchaseIntent =
  (typeof INBOUND_ANALYSIS_PURCHASE_INTENTS)[number]

export const INBOUND_ANALYSIS_CASE_ACTIONS = [
  'none',
  'find_existing',
  'suggest_new',
] as const

export type InboundAnalysisCaseAction =
  (typeof INBOUND_ANALYSIS_CASE_ACTIONS)[number]

export const INBOUND_ANALYSIS_TASK_PRIORITIES = [
  'low',
  'normal',
  'high',
] as const

export type InboundAnalysisTaskPriority =
  (typeof INBOUND_ANALYSIS_TASK_PRIORITIES)[number]

/** Inclusive confidence range for analysis suggestions. */
export const INBOUND_ANALYSIS_CONFIDENCE_MIN = 0
export const INBOUND_ANALYSIS_CONFIDENCE_MAX = 1

/**
 * Channel-agnostic analysis input built from a normalized inbound item
 * (and optional known context). No provider or channel logic.
 */
export type InboundAnalysisInput = {
  /** Source channel label (email, whatsapp, form, …) — informational only. */
  channel: string
  externalId?: string | null
  title?: string | null
  content?: string | null
  kind?: string | null
  receivedAt?: string | null
  sender?: {
    displayName?: string | null
    address?: string | null
    addressKind?: string | null
  } | null
  /** Attachment filenames / mime hints only — never binary payloads. */
  attachments?: Array<{
    filename: string
    mimeType?: string | null
  }>
  /** Opaque campaign/source metadata already present on the inbound item. */
  metadata?: Record<string, unknown> | null
  /**
   * Evidence already known to AgenturOS. Without this, the analyzer must not
   * claim a case or contact match.
   */
  knownContext?: {
    existingCaseIds?: string[]
    contactMatched?: boolean
    notes?: string[]
  } | null
}

export type InboundAnalysisSuggestedTask = {
  title: string
  reason: string
  priority: InboundAnalysisTaskPriority
}

/**
 * Structured, inspectable suggestion. Never an executed action.
 */
export type InboundAnalysisSuggestion = {
  /** Concise summary of what the customer appears to want. */
  summary: string
  intent: InboundAnalysisIntent
  /** Insurance / product topic (e.g. "Kfz", "Wohngebäude") or free text. */
  productTopic: string
  urgency: InboundAnalysisUrgency
  missingInformation: string[]
  purchaseIntent: InboundAnalysisPurchaseIntent
  suggestedCaseAction: InboundAnalysisCaseAction
  suggestedTask: InboundAnalysisSuggestedTask | null
  suggestedReplyDraft: string | null
  humanReviewRequired: boolean
  /** Non-empty when humanReviewRequired is true; otherwise null. */
  humanReviewReason: string | null
  /**
   * Model/analyzer confidence in [INBOUND_ANALYSIS_CONFIDENCE_MIN,
   * INBOUND_ANALYSIS_CONFIDENCE_MAX].
   */
  confidence: number
}

export type InboundAnalysisProviderErrorCode =
  | 'provider_failed'
  | 'invalid_response'
  | 'incomplete_response'
  | 'timeout'
  | 'not_configured'
  | 'unknown'

export class InboundAnalysisProviderError extends Error {
  readonly code: InboundAnalysisProviderErrorCode

  constructor(
    message: string,
    code: InboundAnalysisProviderErrorCode = 'provider_failed',
  ) {
    super(message)
    this.name = 'InboundAnalysisProviderError'
    this.code = code
  }
}

export type InboundAnalysisResult = {
  suggestion: InboundAnalysisSuggestion
  /** True when the safe fallback was used instead of trusted provider output. */
  usedFallback: boolean
  fallbackReason: string | null
  providerId: string | null
}
