/**
 * Sichere HTML→Text-Konvertierung für Inbox-Inhalt.
 * Kein HTML als Arbeitsinhalt; nur grobe Entfernung von Markup.
 */
export function htmlToPlainText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')

  const withBreaks = withoutScripts
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*p\s*>/gi, '\n')
    .replace(/<\s*\/\s*div\s*>/gi, '\n')
    .replace(/<\s*\/\s*tr\s*>/gi, '\n')
    .replace(/<\s*\/\s*li\s*>/gi, '\n')

  const withoutTags = withBreaks.replace(/<[^>]+>/g, ' ')

  return withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}
