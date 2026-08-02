/** Entfernt umschließende <> und trimmt die Message-ID. */
export function normalizeMessageId(messageId: string): string {
  return messageId.trim().replace(/^<|>$/g, '').trim()
}
