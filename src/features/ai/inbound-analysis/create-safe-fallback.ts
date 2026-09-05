import type { InboundAnalysisSuggestion } from '@/features/ai/inbound-analysis/types'
import {
  INBOUND_ANALYSIS_CONFIDENCE_MIN,
} from '@/features/ai/inbound-analysis/types'

/**
 * Deterministic safe fallback when provider output is invalid, incomplete,
 * or the provider fails. Never suggests actionable case/task/reply side effects.
 */
export function createSafeFallbackSuggestion(
  reason: string,
): InboundAnalysisSuggestion {
  const trimmed = reason.trim()
  const humanReviewReason =
    trimmed.length > 0
      ? trimmed
      : 'Analysis unavailable; human review required.'

  return {
    summary:
      'Automatische Analyse nicht vertrauenswürdig. Bitte manuell prüfen.',
    intent: 'unclear',
    productTopic: 'unclear',
    urgency: 'normal',
    missingInformation: [],
    purchaseIntent: 'unclear',
    suggestedCaseAction: 'none',
    suggestedTask: null,
    suggestedReplyDraft: null,
    humanReviewRequired: true,
    humanReviewReason,
    confidence: INBOUND_ANALYSIS_CONFIDENCE_MIN,
  }
}
