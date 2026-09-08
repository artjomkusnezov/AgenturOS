/**
 * Plain-text sanitizer for manual capture.
 * Preserves line breaks. Strips markup. Does not invent content.
 */

export const MANUAL_CAPTURE_TEXT_MAX_LENGTH = 8000
export const MANUAL_CAPTURE_TITLE_MAX_LENGTH = 120

export function sanitizeManualCaptureText(
  raw: string,
  maxLen = MANUAL_CAPTURE_TEXT_MAX_LENGTH,
): string {
  const withoutScripts = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')

  // Keep `Name <email>` pastes — `<email>` is not markup.
  const unwrappedEmails = withoutScripts.replace(
    /<([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>/gi,
    '$1',
  )

  const withoutTags = unwrappedEmails.replace(/<[^>]+>/g, ' ')

  const decoded = withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

  const lines = decoded.split(/\r\n|\n|\r/).map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
  const collapsed = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()

  return collapsed.slice(0, maxLen)
}

export function sanitizeManualCaptureTitle(
  raw: string,
  maxLen = MANUAL_CAPTURE_TITLE_MAX_LENGTH,
): string | null {
  const firstLine = sanitizeManualCaptureText(raw, maxLen * 4)
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)

  if (!firstLine) {
    return null
  }

  if (firstLine.length <= maxLen) {
    return firstLine
  }

  return `${firstLine.slice(0, maxLen).trimEnd()}`
}
