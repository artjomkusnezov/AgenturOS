import { EmptyState } from '@/components/app/empty-state'

export function FileEmptyDetail() {
  return (
    <div className="flex h-full min-h-[20rem] items-center justify-center rounded-xl border border-zinc-200/60 bg-white/50">
      <EmptyState
        title="Datei auswählen"
        description="Wählen Sie links eine Datei aus oder laden Sie eine neue hoch."
      />
    </div>
  )
}
