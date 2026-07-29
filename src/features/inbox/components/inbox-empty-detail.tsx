import { EmptyState } from '@/components/app/empty-state'

export function InboxEmptyDetail() {
  return (
    <div className="flex h-full min-h-[20rem] items-center justify-center rounded-xl border border-zinc-200/60 bg-white/50">
      <EmptyState
        title="Eingangselement auswählen"
        description="Wählen Sie links ein Element aus oder erfassen Sie neuen Inhalt."
      />
    </div>
  )
}
