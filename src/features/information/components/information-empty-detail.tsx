import { EmptyState } from '@/components/app/empty-state'

export function InformationEmptyDetail() {
  return (
    <div className="flex h-full min-h-[20rem] items-center justify-center rounded-xl border border-zinc-200/60 bg-white/50">
      <EmptyState
        title="Information auswählen"
        description="Wählen Sie links eine Information aus oder erstellen Sie eine neue."
      />
    </div>
  )
}
