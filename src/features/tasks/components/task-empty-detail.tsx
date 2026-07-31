import { EmptyState } from '@/components/app/empty-state'
import { aosCardEmptyClassName } from '@/lib/design-system'

export function TaskEmptyDetail() {
  return (
    <div className={`${aosCardEmptyClassName} h-full min-h-[16rem]`}>
      <EmptyState
        title="Vorgang auswählen"
        description="Wählen Sie links einen Vorgang aus, um Details und Arbeitschronik anzuzeigen."
      />
    </div>
  )
}
