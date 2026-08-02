import type { FileRecord } from '@/features/files/types/file'

export type DocumentMediaItem = {
  key: string
  file: FileRecord | null
  mediaUrl: string | null
}

export type MediaDownloadState = {
  error?: string
  success?: boolean
  downloadUrl?: string
}

export type MediaDownloadAction = (
  prevState: MediaDownloadState,
  formData: FormData,
) => Promise<MediaDownloadState>
