import { WorkspaceFrame } from '@/components/app/workspace'
import { loadKfzLaunchReadinessAction } from '@/features/inbound/kfz/actions/load-kfz-launch-readiness'
import { KfzLaunchReadinessView } from '@/features/inbound/kfz/components/kfz-launch-readiness-view'

export const dynamic = 'force-dynamic'

export default async function KfzLaunchReadinessPage() {
  const report = await loadKfzLaunchReadinessAction()

  return (
    <WorkspaceFrame>
      <KfzLaunchReadinessView report={report} />
    </WorkspaceFrame>
  )
}
