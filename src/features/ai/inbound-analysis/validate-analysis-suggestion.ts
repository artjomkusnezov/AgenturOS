import {
  INBOUND_ANALYSIS_CASE_ACTIONS,
  INBOUND_ANALYSIS_CONFIDENCE_MAX,
  INBOUND_ANALYSIS_CONFIDENCE_MIN,
  INBOUND_ANALYSIS_INTENTS,
  INBOUND_ANALYSIS_PURCHASE_INTENTS,
  INBOUND_ANALYSIS_TASK_PRIORITIES,
  INBOUND_ANALYSIS_URGENCIES,
} from '@/features/ai/inbound-analysis/types'
import type {
  InboundAnalysisCaseAction,
  InboundAnalysisIntent,
  InboundAnalysisPurchaseIntent,
  InboundAnalysisSuggestedTask,
  InboundAnalysisSuggestion,
  InboundAnalysisTaskPriority,
  InboundAnalysisUrgency,
} from '@/features/ai/inbound-analysis/types'

export type ParseInboundAnalysisSuccess = {
  ok: true
  suggestion: InboundAnalysisSuggestion
}

export type ParseInboundAnalysisFailure = {
  ok: false
  errors: string[]
}

export type ParseInboundAnalysisResult =
  | ParseInboundAnalysisSuccess
  | ParseInboundAnalysisFailure

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function parseStringList(value: unknown, field: string, errors: string[]): string[] | null {
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array of strings`)
    return null
  }

  const items: string[] = []
  for (let i = 0; i < value.length; i += 1) {
    const item = value[i]
    if (typeof item !== 'string' || item.trim().length === 0) {
      errors.push(`${field}[${i}] must be a non-empty string`)
      return null
    }
    items.push(item.trim())
  }
  return items
}

function parseSuggestedTask(
  value: unknown,
  errors: string[],
): InboundAnalysisSuggestedTask | null | undefined {
  if (value === null) {
    return null
  }
  if (!isRecord(value)) {
    errors.push('suggestedTask must be an object or null')
    return undefined
  }

  if (typeof value.title !== 'string' || value.title.trim().length === 0) {
    errors.push('suggestedTask.title must be a non-empty string')
    return undefined
  }
  if (typeof value.reason !== 'string' || value.reason.trim().length === 0) {
    errors.push('suggestedTask.reason must be a non-empty string')
    return undefined
  }
  if (!isOneOf(value.priority, INBOUND_ANALYSIS_TASK_PRIORITIES)) {
    errors.push(
      `suggestedTask.priority must be one of: ${INBOUND_ANALYSIS_TASK_PRIORITIES.join(', ')}`,
    )
    return undefined
  }

  return {
    title: value.title.trim(),
    reason: value.reason.trim(),
    priority: value.priority as InboundAnalysisTaskPriority,
  }
}

/**
 * Runtime validation for untrusted analysis output.
 * Uses hand-rolled checks (no extra dependency) consistent with the repo.
 */
export function parseInboundAnalysisSuggestion(
  value: unknown,
): ParseInboundAnalysisResult {
  const errors: string[] = []

  if (!isRecord(value)) {
    return { ok: false, errors: ['output must be a plain object'] }
  }

  if (typeof value.summary !== 'string' || value.summary.trim().length === 0) {
    errors.push('summary must be a non-empty string')
  }

  if (!isOneOf(value.intent, INBOUND_ANALYSIS_INTENTS)) {
    errors.push(`intent must be one of: ${INBOUND_ANALYSIS_INTENTS.join(', ')}`)
  }

  if (
    typeof value.productTopic !== 'string' ||
    value.productTopic.trim().length === 0
  ) {
    errors.push('productTopic must be a non-empty string')
  }

  if (!isOneOf(value.urgency, INBOUND_ANALYSIS_URGENCIES)) {
    errors.push(`urgency must be one of: ${INBOUND_ANALYSIS_URGENCIES.join(', ')}`)
  }

  const missingInformation = parseStringList(
    value.missingInformation,
    'missingInformation',
    errors,
  )

  if (!isOneOf(value.purchaseIntent, INBOUND_ANALYSIS_PURCHASE_INTENTS)) {
    errors.push(
      `purchaseIntent must be one of: ${INBOUND_ANALYSIS_PURCHASE_INTENTS.join(', ')}`,
    )
  }

  if (!isOneOf(value.suggestedCaseAction, INBOUND_ANALYSIS_CASE_ACTIONS)) {
    errors.push(
      `suggestedCaseAction must be one of: ${INBOUND_ANALYSIS_CASE_ACTIONS.join(', ')}`,
    )
  }

  const suggestedTask = parseSuggestedTask(value.suggestedTask, errors)

  if (value.suggestedReplyDraft !== null && typeof value.suggestedReplyDraft !== 'string') {
    errors.push('suggestedReplyDraft must be a string or null')
  }

  if (typeof value.humanReviewRequired !== 'boolean') {
    errors.push('humanReviewRequired must be a boolean')
  }

  if (value.humanReviewReason !== null && typeof value.humanReviewReason !== 'string') {
    errors.push('humanReviewReason must be a string or null')
  }

  if (
    typeof value.humanReviewRequired === 'boolean' &&
    value.humanReviewRequired === true &&
    (typeof value.humanReviewReason !== 'string' ||
      value.humanReviewReason.trim().length === 0)
  ) {
    errors.push('humanReviewReason must be a non-empty string when humanReviewRequired is true')
  }

  if (
    typeof value.humanReviewRequired === 'boolean' &&
    value.humanReviewRequired === false &&
    value.humanReviewReason !== null
  ) {
    errors.push('humanReviewReason must be null when humanReviewRequired is false')
  }

  if (
    typeof value.confidence !== 'number' ||
    Number.isNaN(value.confidence) ||
    value.confidence < INBOUND_ANALYSIS_CONFIDENCE_MIN ||
    value.confidence > INBOUND_ANALYSIS_CONFIDENCE_MAX
  ) {
    errors.push(
      `confidence must be a number between ${INBOUND_ANALYSIS_CONFIDENCE_MIN} and ${INBOUND_ANALYSIS_CONFIDENCE_MAX} inclusive`,
    )
  }

  if (
    errors.length > 0 ||
    missingInformation === null ||
    suggestedTask === undefined
  ) {
    return { ok: false, errors }
  }

  const suggestion: InboundAnalysisSuggestion = {
    summary: (value.summary as string).trim(),
    intent: value.intent as InboundAnalysisIntent,
    productTopic: (value.productTopic as string).trim(),
    urgency: value.urgency as InboundAnalysisUrgency,
    missingInformation,
    purchaseIntent: value.purchaseIntent as InboundAnalysisPurchaseIntent,
    suggestedCaseAction: value.suggestedCaseAction as InboundAnalysisCaseAction,
    suggestedTask,
    suggestedReplyDraft:
      value.suggestedReplyDraft === null
        ? null
        : (value.suggestedReplyDraft as string).trim() || null,
    humanReviewRequired: value.humanReviewRequired as boolean,
    humanReviewReason:
      value.humanReviewRequired === true
        ? (value.humanReviewReason as string).trim()
        : null,
    confidence: value.confidence as number,
  }

  return { ok: true, suggestion }
}
