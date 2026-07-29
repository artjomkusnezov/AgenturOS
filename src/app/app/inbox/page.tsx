import { InboxWorkspace } from '@/features/inbox/components/inbox-workspace'
import { listInboxItemsForCurrentUser } from '@/features/inbox/repositories/inbox-repository'

export default async function InboxPage() {
  const result = await listInboxItemsForCurrentUser()

  if (!result.success) {
    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50 px-5 py-4 text-sm text-red-700">
        {result.error}
      </div>
    )
  }

  return (
    <InboxWorkspace
      unprocessedItems={result.unprocessedItems}
      processedItems={result.processedItems}
    />
  )
}
