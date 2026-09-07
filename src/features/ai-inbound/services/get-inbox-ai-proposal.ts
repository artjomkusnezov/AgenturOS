/**
 * Produce an internal AI analysis PROPOSAL for an Inbox item.
 *
 * Guarantees:
 * - No outbound customer contact
 * - No case / task / status / follow-up mutations
 * - Malformed or failed provider output → safe fallback via analyzeInboundItem
 * - Missing config → unavailable state (Inbox remains usable)
 */

import {
  analyzeInboundItem,
  type InboundAnalysisProvider,
} from '@/features/ai/inbound-analysis'
import { logAiInbound } from '@/features/ai-inbound/lib/ai-inbound-log'
import { isKfzWebsiteInboxItem } from '@/features/ai-inbound/lib/is-kfz-website-inbox-item'
import { mapInboxItemToAnalysisInput } from '@/features/ai-inbound/lib/map-inbox-item-to-analysis-input'
import { resolveInboundAnalysisProvider } from '@/features/ai-inbound/providers/resolve-inbound-analysis-provider'
import {
  EMPTY_AI_PROPOSAL_SIDE_EFFECTS,
  type GetInboxAiProposalResult,
  type InboxAiProposal,
} from '@/features/ai-inbound/types'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export type GetInboxAiProposalOptions = {
  enabled?: boolean
  provider?: InboundAnalysisProvider
}

function unavailable(
  reason: 'not_configured' | 'provider_unavailable',
  message: string,
): InboxAiProposal {
  return {
    status: 'unavailable',
    reason,
    message,
    generated: false,
  }
}

/**
 * Pure advisory generation for a single inbox working copy.
 * Side-effect probe is always empty — included so tests can lock the guarantee.
 */
export async function getInboxAiProposal(
  item: InboxItem,
  options: GetInboxAiProposalOptions = {},
): Promise<GetInboxAiProposalResult> {
  const sideEffects = { ...EMPTY_AI_PROPOSAL_SIDE_EFFECTS }

  if (!isKfzWebsiteInboxItem(item)) {
    return {
      proposal: { status: 'not_applicable', generated: false },
      sideEffects,
      analysisResult: null,
    }
  }

  const resolved = resolveInboundAnalysisProvider({
    enabled: options.enabled,
    provider: options.provider,
  })

  if (!resolved.configured) {
    logAiInbound('proposal_unavailable', {
      inboxItemId: item.id,
      reason: 'not_configured',
      channel: item.channel,
      source: item.source,
    })
    return {
      proposal: unavailable(
        'not_configured',
        'KI-Analyse ist nicht konfiguriert. Der Eingang bleibt nutzbar — bitte manuell prüfen.',
      ),
      sideEffects,
      analysisResult: null,
    }
  }

  try {
    const input = mapInboxItemToAnalysisInput(item)
    const analysisResult = await analyzeInboundItem(input, resolved.provider)

    logAiInbound('proposal_generated', {
      inboxItemId: item.id,
      providerId: analysisResult.providerId,
      usedFallback: analysisResult.usedFallback,
      humanReviewRequired: analysisResult.suggestion.humanReviewRequired,
      channel: item.channel,
      source: item.source,
    })

    return {
      proposal: {
        status: 'proposal',
        suggestion: analysisResult.suggestion,
        usedFallback: analysisResult.usedFallback,
        fallbackReason: analysisResult.fallbackReason,
        providerId: analysisResult.providerId,
        sourceLabel: resolved.sourceLabel,
        generated: true,
      },
      sideEffects,
      analysisResult,
    }
  } catch (error) {
    void error
    logAiInbound('proposal_unavailable', {
      inboxItemId: item.id,
      reason: 'provider_unavailable',
      errorCode: 'unexpected',
      channel: item.channel,
    })
    return {
      proposal: unavailable(
        'provider_unavailable',
        'KI-Vorschlag konnte nicht erzeugt werden. Der Eingang bleibt nutzbar — bitte manuell prüfen.',
      ),
      sideEffects,
      analysisResult: null,
    }
  }
}
