import { SupabasePublicConfigError } from '@/lib/supabase/public-config'
import {
  emptyKfzAnalyticsDataQuality,
  kfzAnalyticsDataQualityCopy,
  unavailableKfzAnalyticsDataQuality,
} from '@/features/inbound/kfz/lib/kfz-analytics-quality'
import type {
  KfzAnalyticsDataQuality,
  KfzAnalyticsReviewStatus,
} from '@/features/inbound/kfz/types/kfz-analytics'

export const KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR =
  'Die Kfz-Messung ist nicht konfiguriert. Umgebungswerte werden nicht angezeigt.' as const

export const KFZ_ANALYTICS_UNAVAILABLE_ERROR =
  'Die Kfz-Messdaten sind gerade nicht verfügbar.' as const

export const KFZ_ANALYTICS_EMPTY_TITLE = 'Noch keine Messdaten' as const
export const KFZ_ANALYTICS_EMPTY_FILTER_TITLE =
  'Keine Sitzungen für diese Auswahl' as const
export const KFZ_ANALYTICS_CONFIGURATION_MISSING_TITLE =
  'Messung nicht konfiguriert' as const
export const KFZ_ANALYTICS_UNAVAILABLE_TITLE = 'Messdaten nicht verfügbar' as const

export function classifyKfzAnalyticsDashboardFailure(error: unknown): {
  ok: false
  status: Extract<KfzAnalyticsReviewStatus, 'unavailable' | 'configuration_missing'>
  error: string
} {
  if (error instanceof SupabasePublicConfigError) {
    return {
      ok: false,
      status: 'configuration_missing',
      error: KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR,
    }
  }
  return {
    ok: false,
    status: 'unavailable',
    error: KFZ_ANALYTICS_UNAVAILABLE_ERROR,
  }
}

export function resolveKfzAnalyticsReviewStatus(input: {
  loadStatus?: 'ready' | 'unavailable' | 'configuration_missing'
  empty?: boolean
}): KfzAnalyticsReviewStatus {
  if (input.loadStatus === 'configuration_missing') {
    return 'configuration_missing'
  }
  if (input.loadStatus === 'unavailable') {
    return 'unavailable'
  }
  if (input.empty) {
    return 'empty'
  }
  return 'ready'
}

export function kfzAnalyticsReviewStateCopy(status: KfzAnalyticsReviewStatus): {
  title: string
  body: string
} {
  if (status === 'configuration_missing') {
    return {
      title: KFZ_ANALYTICS_CONFIGURATION_MISSING_TITLE,
      body: KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR,
    }
  }
  if (status === 'unavailable') {
    return {
      title: KFZ_ANALYTICS_UNAVAILABLE_TITLE,
      body: KFZ_ANALYTICS_UNAVAILABLE_ERROR,
    }
  }
  if (status === 'empty') {
    return {
      title: KFZ_ANALYTICS_EMPTY_TITLE,
      body: 'In diesem Zeitraum liegen keine anonymen Ereignisse vor. Es wird nichts hochgerechnet und keine Herkunft erfunden.',
    }
  }
  return {
    title: 'Messung der Kfz-Strecke',
    body: 'Nur anonyme, allow-listed Ereignisse. Keine Formularantworten, keine Kontaktdaten, keine automatische Bewertung.',
  }
}

export function reviewCopyLeaksEnvironment(text: string): boolean {
  return (
    /eyJ[A-Za-z0-9_-]{20,}/.test(text) ||
    /=sk[_-]|service_role|Bearer\s+/i.test(text) ||
    /https?:\/\/[^\s]+supabase/i.test(text) ||
    /KEY=|SECRET=|TOKEN=/i.test(text)
  )
}

export function resolveKfzAnalyticsDataQualityState(input: {
  loadStatus?: 'ready' | 'unavailable' | 'configuration_missing'
  dataQuality?: KfzAnalyticsDataQuality
  empty?: boolean
}): KfzAnalyticsDataQuality {
  if (input.loadStatus === 'configuration_missing') {
    return unavailableKfzAnalyticsDataQuality('configuration_missing')
  }
  if (input.loadStatus === 'unavailable') {
    return unavailableKfzAnalyticsDataQuality('unavailable')
  }
  if (input.dataQuality) {
    return input.dataQuality
  }
  return emptyKfzAnalyticsDataQuality(input.empty ? 'empty' : 'ready')
}

export function kfzAnalyticsQualityStateCopy(quality: KfzAnalyticsDataQuality): {
  title: string
  body: string
} {
  return kfzAnalyticsDataQualityCopy(quality)
}
