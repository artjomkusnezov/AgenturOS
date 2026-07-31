import { EmptyState } from '@/components/app/empty-state'

export function TaskEmptyDetail() {
  return (
    <div className="flex h-full min-h-[20rem] items-center justify-center rounded-xl border border-zinc-200/60 bg-white/50">
      <EmptyState
        title="Vorgang auswählen"
        description="Wähle links einen Vorgang aus, um Details und Arbeitschronik anzuzeigen."
      />
    </div>
  )
}
