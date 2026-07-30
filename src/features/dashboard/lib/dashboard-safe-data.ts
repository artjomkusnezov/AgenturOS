export function sanitizeDashboardCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0
  }

  return Math.floor(value)
}

export function sanitizeDashboardLabel(value: string | null | undefined, fallback: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : ''

  return trimmed.length > 0 ? trimmed : fallback
}
