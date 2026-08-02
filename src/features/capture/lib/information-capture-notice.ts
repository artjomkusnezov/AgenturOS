export function buildInformationAttachmentNotice(
  attachedCount: number,
  totalCount: number,
): string | null {
  if (totalCount <= 0 || attachedCount >= totalCount) {
    return null
  }

  return `Information wurde erstellt. ${attachedCount} von ${totalCount} Dateien konnten angehängt werden.`
}

export function buildInformationAttachmentQueryValue(
  attachedCount: number,
  totalCount: number,
): string | null {
  if (totalCount <= 0 || attachedCount >= totalCount) {
    return null
  }

  return `${attachedCount}/${totalCount}`
}

export function parseInformationAttachmentNotice(
  itemId: string | null,
  attachmentsParam: string | undefined,
): string | null {
  if (!itemId || !attachmentsParam) {
    return null
  }

  const match = attachmentsParam.match(/^(\d+)\/(\d+)$/)

  if (!match) {
    return null
  }

  const attachedCount = Number(match[1])
  const totalCount = Number(match[2])

  if (!Number.isFinite(attachedCount) || !Number.isFinite(totalCount)) {
    return null
  }

  return buildInformationAttachmentNotice(attachedCount, totalCount)
}

export function buildInformationUrlWithAttachmentNotice(
  itemId: string,
  attachedCount: number,
  totalCount: number,
): string {
  const attachments = buildInformationAttachmentQueryValue(attachedCount, totalCount)

  if (!attachments) {
    return `/app/information?item=${itemId}`
  }

  return `/app/information?item=${itemId}&attachments=${attachments}`
}
