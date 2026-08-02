import { EmptyState } from '@/components/app/empty-state'
import { aosCardEmptyClassName } from '@/lib/design-system'

export function InboxEmptyDetail() {
  return (
    <div className={`${aosCardEmptyClassName} h-full min-h-[12rem]`}>
      <EmptyState
        title="Nichts ausgewählt"
        description="Wählen Sie links ein Element oder erfassen Sie neuen Inhalt."
      />
    </div>
  )
}
