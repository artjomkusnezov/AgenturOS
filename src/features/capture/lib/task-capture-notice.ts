export function buildTaskAttachmentNotice(attachedCount: number, totalCount: number): string | null {
  if (totalCount <= 0 || attachedCount >= totalCount) {
    return null
  }

  return `Aufgabe wurde erstellt. ${attachedCount} von ${totalCount} Dateien konnten angehängt werden.`
}

export function buildTaskAttachmentQueryValue(attachedCount: number, totalCount: number): string | null {
  if (totalCount <= 0 || attachedCount >= totalCount) {
    return null
  }

  return `${attachedCount}/${totalCount}`
}

export function parseTaskAttachmentNotice(
  taskId: string | null,
  attachmentsParam: string | undefined,
): string | null {
  if (!taskId || !attachmentsParam) {
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

  return buildTaskAttachmentNotice(attachedCount, totalCount)
}

export function buildTaskUrlWithAttachmentNotice(
  taskId: string,
  attachedCount: number,
  totalCount: number,
): string {
  const attachments = buildTaskAttachmentQueryValue(attachedCount, totalCount)

  if (!attachments) {
    return `/app/tasks?task=${taskId}`
  }

  return `/app/tasks?task=${taskId}&attachments=${attachments}`
}
