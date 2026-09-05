/**
 * Provider boundary for inbound analysis.
 * Implementations may call an LLM later; the domain stays provider-agnostic.
 */

import type { InboundAnalysisInstructions } from '@/features/ai/inbound-analysis/build-analysis-instructions'
import type { InboundAnalysisInput } from '@/features/ai/inbound-analysis/types'

export type InboundAnalysisProviderRequest = {
  input: InboundAnalysisInput
  instructions: InboundAnalysisInstructions
}

/**
 * Returns untrusted structured output (typically a plain object).
 * The domain layer validates before accepting any suggestion.
 */
export interface InboundAnalysisProvider {
  readonly id: string
  analyze(request: InboundAnalysisProviderRequest): Promise<unknown>
}
