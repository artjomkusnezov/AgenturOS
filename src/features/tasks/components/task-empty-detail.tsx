import { EmptyState } from '@/components/app/empty-state'
import { aosCardEmptyClassName } from '@/lib/design-system'

export function TaskEmptyDetail() {
  return (
    <div className={`${aosCardEmptyClassName} h-full min-h-[12rem]`}>
      <EmptyState
        title="Nichts ausgewählt"
        description="Wählen Sie links einen Vorgang, um Details und Chronik zu sehen."
      />
    </div>
  )
}
