'use server'

import { evaluateKfzLaunchReadiness } from '@/features/inbound/kfz/lib/kfz-launch-readiness'
import type { KfzLaunchReadinessReport } from '@/features/inbound/kfz/types/kfz-launch-readiness'

export async function loadKfzLaunchReadinessAction(): Promise<KfzLaunchReadinessReport> {
  return evaluateKfzLaunchReadiness()
}
