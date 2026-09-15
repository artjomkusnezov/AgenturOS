/**
 * Sichere Textfelder: Markup/Script entfernen, als Klartext speichern.
 * Inbox rendert Text — kein HTML als ausführbaren Inhalt.
 */

export function sanitizePlainTextField(raw: string, maxLen: number): string {
  const withoutScripts = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')

  const withoutTags = withoutScripts.replace(/<[^>]+>/g, ' ')

  const decoded = withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return decoded.slice(0, maxLen)
}
