import { EmptyState } from '@/components/app/empty-state'

export function ContactEmptyDetail() {
  return (
    <div className="flex h-full min-h-[20rem] items-center justify-center rounded-xl border border-zinc-200/60 bg-white/50">
      <EmptyState
        title="Kontakt auswählen"
        description="Wählen Sie links einen Kontakt aus oder legen Sie einen neuen an."
      />
    </div>
  )
}
