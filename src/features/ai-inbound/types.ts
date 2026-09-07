/**
 * Inbox-facing AI proposal view model.
 * Advisory only — never an executed customer or domain action.
 */

import type {
  InboundAnalysisResult,
  InboundAnalysisSuggestion,
} from '@/features/ai/inbound-analysis'

export type InboxAiProposalStatus =
  | 'proposal'
  | 'unavailable'
  | 'not_applicable'

export type InboxAiProposalUnavailableReason =
  | 'not_configured'
  | 'provider_unavailable'
  | 'not_kfz_website'

/**
 * Visible internal proposal for a human agent.
 * Always labeled as AI suggestion / Entwurf / Vorschlag in the UI.
 */
export type InboxAiProposalView = {
  status: 'proposal'
  /** Existing validated suggestion contract. */
  suggestion: InboundAnalysisSuggestion
  usedFallback: boolean
  fallbackReason: string | null
  providerId: string | null
  /** Short German label for the analysis source (e.g. local heuristic). */
  sourceLabel: string
  /** True when generation ran; never implies outbound or mutations. */
  generated: true
}

export type InboxAiProposalUnavailable = {
  status: 'unavailable'
  reason: InboxAiProposalUnavailableReason
  message: string
  generated: false
}

export type InboxAiProposalNotApplicable = {
  status: 'not_applicable'
  generated: false
}

export type InboxAiProposal =
  | InboxAiProposalView
  | InboxAiProposalUnavailable
  | InboxAiProposalNotApplicable

/** Result of a proposal generation call (advisory only — no domain mutations). */
export type GetInboxAiProposalResult = {
  proposal: InboxAiProposal
  analysisResult: InboundAnalysisResult | null
}
