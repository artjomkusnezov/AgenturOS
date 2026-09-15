/**
 * Local deterministic InboundAnalysisProvider for Kfz website leads.
 * Does not call external model hosts and does not send customer data off-box.
 */

import type {
  InboundAnalysisProvider,
  InboundAnalysisProviderRequest,
} from '@/features/ai/inbound-analysis'
import { InboundAnalysisProviderError } from '@/features/ai/inbound-analysis'
import { buildKfzLocalProposal } from '@/features/ai-inbound/lib/build-kfz-local-proposal'

export const LOCAL_KFZ_ANALYSIS_PROVIDER_ID = 'local-kfz-heuristic' as const

export function createLocalKfzAnalysisProvider(): InboundAnalysisProvider {
  return {
    id: LOCAL_KFZ_ANALYSIS_PROVIDER_ID,
    async analyze(request: InboundAnalysisProviderRequest): Promise<unknown> {
      void request.instructions
      try {
        return buildKfzLocalProposal(request.input)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'local proposal failed'
        throw new InboundAnalysisProviderError(message, 'provider_failed')
      }
    },
  }
}

/**
 * Provider that always fails as not_configured — used when analysis is disabled.
 */
export function createNotConfiguredAnalysisProvider(): InboundAnalysisProvider {
  return {
    id: 'not-configured',
    async analyze(): Promise<unknown> {
      throw new InboundAnalysisProviderError(
        'Inbound AI analysis is not configured.',
        'not_configured',
      )
    },
  }
}
