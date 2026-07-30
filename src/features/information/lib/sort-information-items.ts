import type { InformationItem } from '@/features/information/types/information-item'

export function sortInformationItems(items: InformationItem[]): InformationItem[] {
  return [...items].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
}
