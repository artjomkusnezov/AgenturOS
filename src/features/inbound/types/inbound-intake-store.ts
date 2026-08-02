import type { InboxItem } from '@/features/inbox/types/inbox-item'
import type {
  InboundAttachmentInput,
  InboundChannel,
  InboundItemKind,
  InboundSenderRecord,
} from '@/features/inbound/types/inbound-item'

export type InboundCreatedItemInput = {
  agencyId: string
  actorUserId: string
  content: string
  title: string | null
  source: string
  channel: InboundChannel
  externalId: string
  sender: InboundSenderRecord
  origin: InboundSenderRecord | null
  receivedAt: string
  itemKind: InboundItemKind | null
  metadata: Record<string, unknown>
}

/**
 * Persistenz-Port für den Intake-Kern.
 * Adapter und Tests injizieren Implementierungen.
 * Webhooks: Store mit service_role (siehe createServiceRoleInboundIntakeStore).
 */
export type InboundIntakeStore = {
  findByExternalIdentity: (input: {
    agencyId: string
    channel: InboundChannel
    externalId: string
  }) => Promise<InboxItem | null>
  createInboxItem: (input: InboundCreatedItemInput) => Promise<InboxItem>
  uploadAndLinkAttachment: (input: {
    agencyId: string
    actorUserId: string
    inboxItemId: string
    attachment: InboundAttachmentInput
  }) => Promise<{ success: true; fileId: string } | { success: false; error: string }>
}
