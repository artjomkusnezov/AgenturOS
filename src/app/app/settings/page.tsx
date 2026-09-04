import { WorkspaceFrame } from '@/components/app/workspace'
import { DashboardIconSettings } from '@/features/dashboard/components/dashboard-icons'
import { LogoutButton } from '@/features/auth/components/logout-button'

export default function SettingsPage() {
  return (
    <WorkspaceFrame compact>
      <div className="aos-ws-empty-detail max-w-xl">
        <span className="aos-ws-empty-icon" aria-hidden="true">
          <DashboardIconSettings className="h-5 w-5" />
        </span>
        <h2 className="aos-ws-empty-title">Einstellungen folgen später</h2>
        <p className="aos-ws-empty-copy">
          Hier werden später persönliche und anwendungsbezogene Einstellungen verwaltet.
        </p>
        <div className="mt-4 lg:hidden">
          <LogoutButton />
        </div>
      </div>
    </WorkspaceFrame>
  )
}
