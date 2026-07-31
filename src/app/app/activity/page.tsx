import { ActivityPageContent } from '@/features/activity/components/activity-page-content'
import { aosTextMetaClassName, aosTextPageTitleClassName } from '@/lib/design-system'

export default function ActivityPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-2">
      <header className="space-y-1">
        <h1 className={aosTextPageTitleClassName}>Aktivitäten</h1>
        <p className={aosTextMetaClassName}>
          Wichtige Änderungen in gemeinsamen Vorgängen.
        </p>
      </header>

      <ActivityPageContent />
    </div>
  )
}
