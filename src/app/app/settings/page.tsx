import { EmptyState } from '@/components/app/empty-state'
import { WorkspaceFrame } from '@/components/app/workspace'
import { LogoutButton } from '@/features/auth/components/logout-button'

export default function SettingsPage() {
  return (
    <WorkspaceFrame>
      <EmptyState
        title="Einstellungen folgen in einem späteren Schritt"
        description="Hier werden später persönliche und anwendungsbezogene Einstellungen verwaltet."
      />
      <div className="mt-8 lg:hidden">
        <LogoutButton />
      </div>
    </WorkspaceFrame>
  )
}
