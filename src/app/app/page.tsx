import { EmptyState } from '@/components/app/empty-state'
import { QuickCaptureButton } from '@/components/app/quick-capture-button'
import { getGermanDateLabel } from '@/lib/user/get-display-name'

export default function AppDashboardPage() {
  return (
    <div className="space-y-10">
      <section className="pb-2">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          {getGermanDateLabel()}
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
          Guten Tag
        </h2>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-zinc-500">
          Hier sehen Sie später Ihre wichtigsten Aufgaben, Informationen und
          Aktivitäten auf einen Blick.
        </p>
        <div className="mt-6 hidden sm:block">
          <QuickCaptureButton />
        </div>
      </section>

      <section aria-labelledby="open-tasks-heading" className="border-t border-zinc-200/80 pt-8">
        <div className="mb-1 flex items-center justify-between gap-4">
          <h2
            id="open-tasks-heading"
            className="text-sm font-semibold tracking-tight text-zinc-900"
          >
            Offene Aufgaben
          </h2>
        </div>
        <EmptyState
          title="Noch keine offenen Aufgaben"
          description="Sobald das Aufgabenmodul verfügbar ist, erscheinen hier Ihre nächsten Schritte."
        />
      </section>

      <section aria-labelledby="new-information-heading" className="border-t border-zinc-200/80 pt-8">
        <div className="mb-1">
          <h2
            id="new-information-heading"
            className="text-sm font-semibold tracking-tight text-zinc-900"
          >
            Neue Informationen
          </h2>
        </div>
        <EmptyState
          title="Neue Informationen erscheinen später hier"
          description="Die zentrale Informationsablage wird in einem späteren Schritt angebunden."
        />
      </section>

      <section aria-labelledby="recent-activity-heading" className="border-t border-zinc-200/80 pt-8">
        <div className="mb-1">
          <h2
            id="recent-activity-heading"
            className="text-sm font-semibold tracking-tight text-zinc-900"
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
