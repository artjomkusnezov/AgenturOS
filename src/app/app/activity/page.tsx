import { ActivityPageContent } from '@/features/activity/components/activity-page-content'
import { WorkspaceFrame } from '@/components/app/workspace'

export default function ActivityPage() {
  return (
    <WorkspaceFrame narrow>
      <ActivityPageContent />
    </WorkspaceFrame>
  )
}
