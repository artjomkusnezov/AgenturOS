import { ActivityPageContent } from '@/features/activity/components/activity-page-content'

export default function ActivityPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Aktivitäten</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Wichtige Änderungen in gemeinsamen Vorgängen.
        </p>
      </header>

      <ActivityPageContent />
    </div>
  )
}
