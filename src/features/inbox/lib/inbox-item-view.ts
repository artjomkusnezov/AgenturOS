/**
 * Same-item inbox surfaces: work area vs factual review history.
 * Opening history never leaves the selected inbound item.
 */

export const INBOX_ITEM_VIEW_PARAM = 'view' as const

export const INBOX_ITEM_VIEWS = ['work', 'history'] as const

export type InboxItemView = (typeof INBOX_ITEM_VIEWS)[number]

export function isInboxItemView(value: string): value is InboxItemView {
  return (INBOX_ITEM_VIEWS as readonly string[]).includes(value)
}

export function parseInboxItemView(
  value: string | null | undefined,
): InboxItemView {
  if (!value) {
    return 'work'
  }

  const trimmed = value.trim()
  return trimmed === 'history' ? 'history' : 'work'
}
