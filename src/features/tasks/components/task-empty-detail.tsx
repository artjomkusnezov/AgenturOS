import { EmptyState } from '@/components/app/empty-state'

export function TaskEmptyDetail() {
  return (
    <div className="flex h-full min-h-[16rem] items-center justify-center rounded-xl border border-dashed border-zinc-200/60 bg-white/40">
      <EmptyState
        title="Vorgang auswählen"
        description="Wählen Sie links einen Vorgang aus, um Details und Arbeitschronik anzuzeigen."
      />
    </div>
  )
}
