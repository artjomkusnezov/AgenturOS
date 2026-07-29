import { EmptyState } from '@/components/app/empty-state'
import { QuickCaptureButton } from '@/components/app/quick-capture-button'
import { getGermanDateLabel } from '@/lib/user/get-display-name'

export default function AppDashboardPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">{getGermanDateLabel()}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Guten Tag
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Hier sehen Sie später Ihre wichtigsten Aufgaben, Informationen und
          Aktivitäten auf einen Blick.
        </p>
        <div className="mt-6 hidden sm:block">
          <QuickCaptureButton />
        </div>
      </section>

      <section aria-labelledby="open-tasks-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="open-tasks-heading" className="text-lg font-semibold text-zinc-900">
            Offene Aufgaben
          </h2>
        </div>
        <EmptyState
          title="Noch keine offenen Aufgaben"
          description="Sobald das Aufgabenmodul verfügbar ist, erscheinen hier Ihre nächsten Schritte."
        />
      </section>

      <section aria-labelledby="new-information-heading">
        <div className="mb-4">
          <h2
            id="new-information-heading"
            className="text-lg font-semibold text-zinc-900"
          >
            Neue Informationen
          </h2>
        </div>
        <EmptyState
          title="Neue Informationen erscheinen später hier"
          description="Die zentrale Informationsablage wird in einem späteren Schritt angebunden."
        />
      </section>

      <section aria-labelledby="recent-activity-heading">
        <div className="mb-4">
          <h2
            id="recent-activity-heading"
            className="text-lg font-semibold text-zinc-900"
          >
            Letzte Aktivitäten
          </h2>
        </div>
        <EmptyState
          title="Noch keine Aktivitäten"
          description="Aktivitäten werden angezeigt, sobald das Modul verfügbar ist."
        />
      </section>
    </div>
  )
}
