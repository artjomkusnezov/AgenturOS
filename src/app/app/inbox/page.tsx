import { listCurrentAgencyMembers } from '@/features/agency/repositories/agency-repository'
import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import type { InboxAiProposal } from '@/features/ai-inbound/types'
import { InboxWorkspace } from '@/features/inbox/components/inbox-workspace'
import { enrichInboxAttachmentsWithMediaUrls } from '@/features/inbox/lib/enrich-inbox-attachments'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import {
  listFilesForInboxItem,
  listInboxItemsForCurrentUser,
} from '@/features/inbox/repositories/inbox-repository'
import type { InboxLinkedFile } from '@/features/inbox/types/inbox-item'
import { buildMemberNameMap } from '@/features/tasks/lib/resolve-task-member-name'
import { aosAlertErrorClassName } from '@/lib/design-system'

type InboxPageProps = {
  searchParams: Promise<{ item?: string }>
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const { item } = await searchParams
  const [result, membersResult] = await Promise.all([
    listInboxItemsForCurrentUser(),
    listCurrentAgencyMembers(),
  ])

  if (!result.success) {
    return (
      <div className={`${aosAlertErrorClassName} px-5 py-4`}>
        {result.error}
      </div>
    )
  }

  const memberNameMap = membersResult.success
    ? buildMemberNameMap(membersResult.members)
    : {}

  const allItems = [...result.unprocessedItems, ...result.processedItems]
  const selectedItemId =
    item && isValidInboxItemId(item) && allItems.some((entry) => entry.id === item)
      ? item
      : null

  let attachments: InboxLinkedFile[] = []
  let aiProposal: InboxAiProposal | null = null

  if (selectedItemId) {
    const selectedItem = allItems.find((entry) => entry.id === selectedItemId) ?? null
    const attachmentsResult = await listFilesForInboxItem(selectedItemId)

    if (attachmentsResult.success) {
      attachments = await enrichInboxAttachmentsWithMediaUrls(attachmentsResult.files)
    }

    if (selectedItem) {
      const proposalResult = await getInboxAiProposal(selectedItem)
      aiProposal = proposalResult.proposal
    }
  }

  return (
    <InboxWorkspace
      unprocessedItems={result.unprocessedItems}
      processedItems={result.processedItems}
      taskRelationsByItemId={result.taskRelationsByItemId}
      selectedItemId={selectedItemId}
      attachments={attachments}
      memberNameMap={memberNameMap}
      aiProposal={aiProposal}
    />
  )
}
