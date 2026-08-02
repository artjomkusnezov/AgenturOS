import { InboxWorkspace } from '@/features/inbox/components/inbox-workspace'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import { listInboxItemsForCurrentUser } from '@/features/inbox/repositories/inbox-repository'
import { aosAlertErrorClassName } from '@/lib/design-system'

type InboxPageProps = {
  searchParams: Promise<{ item?: string }>
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const { item } = await searchParams
  const result = await listInboxItemsForCurrentUser()

  if (!result.success) {
    return (
      <div className={`${aosAlertErrorClassName} px-5 py-4`}>
        {result.error}
      </div>
    )
  }

  const allItems = [...result.unprocessedItems, ...result.processedItems]
  const selectedItemId =
    item && isValidInboxItemId(item) && allItems.some((entry) => entry.id === item)
      ? item
      : null

  return (
    <InboxWorkspace
      unprocessedItems={result.unprocessedItems}
      processedItems={result.processedItems}
      taskRelationsByItemId={result.taskRelationsByItemId}
      selectedItemId={selectedItemId}
    />
  )
}
