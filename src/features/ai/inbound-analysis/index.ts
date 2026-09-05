export type {
  InboundAnalysisCaseAction,
  InboundAnalysisInput,
  InboundAnalysisIntent,
  InboundAnalysisProviderErrorCode,
  InboundAnalysisPurchaseIntent,
  InboundAnalysisResult,
  InboundAnalysisSuggestedTask,
  InboundAnalysisSuggestion,
  InboundAnalysisTaskPriority,
  InboundAnalysisUrgency,
} from '@/features/ai/inbound-analysis/types'

export {
  INBOUND_ANALYSIS_CASE_ACTIONS,
  INBOUND_ANALYSIS_CONFIDENCE_MAX,
  INBOUND_ANALYSIS_CONFIDENCE_MIN,
  INBOUND_ANALYSIS_INTENTS,
  INBOUND_ANALYSIS_PURCHASE_INTENTS,
  INBOUND_ANALYSIS_TASK_PRIORITIES,
  INBOUND_ANALYSIS_URGENCIES,
  InboundAnalysisProviderError,
} from '@/features/ai/inbound-analysis/types'

export { analyzeInboundItem } from '@/features/ai/inbound-analysis/analyze-inbound-item'
export {
  buildInboundAnalysisInstructions,
  type InboundAnalysisInstructions,
} from '@/features/ai/inbound-analysis/build-analysis-instructions'
export { createSafeFallbackSuggestion } from '@/features/ai/inbound-analysis/create-safe-fallback'
export {
  parseInboundAnalysisSuggestion,
  type ParseInboundAnalysisResult,
} from '@/features/ai/inbound-analysis/validate-analysis-suggestion'
export type {
  InboundAnalysisProvider,
  InboundAnalysisProviderRequest,
} from '@/features/ai/inbound-analysis/provider'
