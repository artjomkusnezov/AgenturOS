/**
 * Resolve the active inbound analysis provider for Inbox proposals.
 */

import type { InboundAnalysisProvider } from '@/features/ai/inbound-analysis'
import { getAiInboundRuntimeConfig } from '@/features/ai-inbound/config/ai-inbound-config'
import {
  createLocalKfzAnalysisProvider,
  createNotConfiguredAnalysisProvider,
} from '@/features/ai-inbound/providers/local-kfz-analysis-provider'

export function resolveInboundAnalysisProvider(
  overrides?: Partial<{ enabled: boolean; provider: InboundAnalysisProvider }>,
): {
  provider: InboundAnalysisProvider
  configured: boolean
  sourceLabel: string
} {
  if (overrides?.provider) {
    return {
      provider: overrides.provider,
      configured: true,
      sourceLabel: overrides.provider.id,
    }
  }

  const config = getAiInboundRuntimeConfig()
  const enabled = overrides?.enabled ?? config.enabled

  if (!enabled) {
    return {
      provider: createNotConfiguredAnalysisProvider(),
      configured: false,
      sourceLabel: 'nicht konfiguriert',
    }
  }

  const provider = createLocalKfzAnalysisProvider()
  return {
    provider,
    configured: true,
    sourceLabel: 'Lokale Heuristik (Vorschlag)',
  }
}
