export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    const kilobytes = bytes / 1024
    return `${kilobytes >= 10 ? Math.round(kilobytes) : kilobytes.toFixed(1)} KB`
  }

  const megabytes = bytes / (1024 * 1024)
  return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`
}

export function formatMimeTypeLabel(mimeType: string): string {
  const trimmed = mimeType.trim()

  if (!trimmed) {
    return 'Unbekannter Typ'
  }

  return trimmed
}

export function formatUploadLimitHint(): string {
  return 'Maximal 50 MB pro Datei. Mehrere Dateien können nacheinander hochgeladen werden.'
}
