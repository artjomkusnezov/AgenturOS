export type CaptureFieldErrors = {
  content?: string
  files?: string
}

export type CaptureQueueStatus = 'queued' | 'uploading' | 'success' | 'error'

export type CaptureQueueItem = {
  clientId: string
  file: File
  status: CaptureQueueStatus
  error?: string
  fileId?: string
}

export type CaptureUploadProgress = {
  current: number
  total: number
  filename: string
}

export type CaptureInboxActionResult =
  | { success: true; itemId: string }
  | { error: string }

export type CaptureLinkFileActionResult = { success: true } | { error: string }

export type CaptureDeleteInboxActionResult = { success: true } | { error: string }
