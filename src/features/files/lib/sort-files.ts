import type { FileRecord } from '@/features/files/types/file'

export function sortFiles(files: FileRecord[]): FileRecord[] {
  return [...files].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}
