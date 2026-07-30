import { EmptyState } from '@/components/app/empty-state'

export function FileEmptyDetail() {
  return (
    <div
      className="flex h-full min-h-[20rem] items-center justify-center rounded-xl border border-zinc-200/60 bg-white/50 px-4"
      aria-label="Keine Datei ausgewählt"
    >
      <EmptyState
        title="Datei auswählen"
        description="Wählen Sie links eine Datei aus der Liste oder laden Sie neue Dateien hoch, um Details anzuzeigen."
      />
    </div>
  )
}
