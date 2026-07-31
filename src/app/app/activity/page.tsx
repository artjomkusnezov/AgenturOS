import { ActivityPageContent } from '@/features/activity/components/activity-page-content'

export default function ActivityPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-2">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Aktivitäten</h1>
        <p className="text-sm text-zinc-500">
          Wichtige Änderungen in gemeinsamen Vorgängen.
        </p>
      </header>

      <ActivityPageContent />
    </div>
  )
}
