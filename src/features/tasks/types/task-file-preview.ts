import type { FileRecord } from '@/features/files/types/file'

export type TaskFilePreviewLoadState =
  | { status: 'none' }
  | { status: 'invalid' }
  | { status: 'no_task' }
  | { status: 'error'; message: string }
  | { status: 'ready'; file: FileRecord; previewUrl: string }

export type TaskFilePreviewMutationState = {
  error?: string
  success?: boolean
  downloadUrl?: string
}
