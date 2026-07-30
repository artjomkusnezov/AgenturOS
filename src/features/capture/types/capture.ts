export type CaptureFieldErrors = {
  content?: string
  files?: string
}

export type CaptureFailedFile = {
  filename: string
  error: string
}

export type CaptureMutationState = {
  fieldErrors?: CaptureFieldErrors
  error?: string
  success?: boolean
  itemId?: string
  failedFiles?: CaptureFailedFile[]
  uploadedFileCount?: number
}

export type CaptureQueueItem = {
  clientId: string
  file: File
  error?: string
}
