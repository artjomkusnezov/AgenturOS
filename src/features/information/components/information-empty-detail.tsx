import { EmptyState } from '@/components/app/empty-state'
import { aosCardEmptyClassName } from '@/lib/design-system'

export function InformationEmptyDetail() {
  return (
    <div className={`${aosCardEmptyClassName} h-full min-h-[12rem]`}>
      <EmptyState
        title="Nichts ausgewählt"
        description="Wählen Sie links eine Information oder erstellen Sie eine neue."
      />
    </div>
  )
}
