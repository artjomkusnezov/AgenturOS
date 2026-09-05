import type { InboundAnalysisProvider } from '@/features/ai/inbound-analysis/provider'
import type {
  InboundAnalysisInput,
  InboundAnalysisResult,
} from '@/features/ai/inbound-analysis/types'
import { InboundAnalysisProviderError } from '@/features/ai/inbound-analysis/types'
import { buildInboundAnalysisInstructions } from '@/features/ai/inbound-analysis/build-analysis-instructions'
import { createSafeFallbackSuggestion } from '@/features/ai/inbound-analysis/create-safe-fallback'
import { parseInboundAnalysisSuggestion } from '@/features/ai/inbound-analysis/validate-analysis-suggestion'

/**
 * Runs provider-neutral inbound analysis.
 *
 * - Builds instructions (no customer data sent externally in this task).
 * - Calls the injected provider.
 * - Treats all provider output as untrusted and validates it.
 * - On any failure or invalid output: deterministic safe fallback
 *   (humanReviewRequired=true, no suggested actions).
 */
export async function analyzeInboundItem(
  input: InboundAnalysisInput,
  provider: InboundAnalysisProvider,
): Promise<InboundAnalysisResult> {
  const instructions = buildInboundAnalysisInstructions(input)

  let raw: unknown
  try {
    raw = await provider.analyze({ input, instructions })
  } catch (error) {
    const reason =
      error instanceof InboundAnalysisProviderError
        ? `Provider failed (${error.code}): ${error.message}`
        : error instanceof Error
          ? `Provider failed: ${error.message}`
          : 'Provider failed with an unknown error.'

    return {
      suggestion: createSafeFallbackSuggestion(reason),
      usedFallback: true,
      fallbackReason: reason,
      providerId: provider.id,
    }
  }

  const parsed = parseInboundAnalysisSuggestion(raw)
  if (!parsed.ok) {
    const reason = `Invalid or incomplete provider output: ${parsed.errors.join('; ')}`
    return {
      suggestion: createSafeFallbackSuggestion(reason),
      usedFallback: true,
      fallbackReason: reason,
      providerId: provider.id,
    }
  }

  return {
    suggestion: parsed.suggestion,
    usedFallback: false,
    fallbackReason: null,
    providerId: provider.id,
  }
}
