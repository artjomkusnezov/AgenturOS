/**
 * German display labels for supported inbound-analysis proposal fields.
 */

import type {
  InboundAnalysisIntent,
  InboundAnalysisPurchaseIntent,
  InboundAnalysisUrgency,
} from '@/features/ai/inbound-analysis'

export const AI_PROPOSAL_BADGE_LABEL = 'KI-Vorschlag · Entwurf'

export const AI_PROPOSAL_HUMAN_REVIEW_LABEL =
  'KI-Text ist ein Vorschlag — menschliche Prüfung erforderlich'

export const INTENT_LABELS: Record<InboundAnalysisIntent, string> = {
  service: 'Service',
  claim: 'Schaden',
  new_business: 'Neugeschäft',
  unclear: 'Unklar',
}

export const URGENCY_LABELS: Record<InboundAnalysisUrgency, string> = {
  low: 'Niedrig',
  normal: 'Normal',
  high: 'Hoch',
  immediate: 'Sofort',
}

export const PURCHASE_INTENT_LABELS: Record<
  InboundAnalysisPurchaseIntent,
  string
> = {
  none: 'Kein Abschlussimpuls (Vorschlag)',
  possible: 'Möglicher Abschlussimpuls (Vorschlag)',
  strong: 'Starker Abschlussimpuls (Vorschlag)',
  unclear: 'Abschlussimpuls unklar (Vorschlag)',
}

export function labelIntent(value: InboundAnalysisIntent): string {
  return INTENT_LABELS[value]
}

export function labelUrgency(value: InboundAnalysisUrgency): string {
  return URGENCY_LABELS[value]
}

export function labelPurchaseIntent(
  value: InboundAnalysisPurchaseIntent,
): string {
  return PURCHASE_INTENT_LABELS[value]
}
