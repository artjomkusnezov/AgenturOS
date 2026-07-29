import { EmptyState } from '@/components/app/empty-state'
import { LogoutButton } from '@/features/auth/components/logout-button'

export default function SettingsPage() {
  return (
    <>
      <EmptyState
        title="Einstellungen folgen in einem späteren Schritt"
        description="Hier werden später persönliche und anwendungsbezogene Einstellungen verwaltet."
      />
      <div className="mt-8 lg:hidden">
        <LogoutButton />
      </div>
    </>
  )
}
