import type { Tables } from '@/lib/supabase/types'

export type FileRecord = Tables<'files'>

export type FileFieldErrors = {
  file?: string
}

export type FileMutationState = {
  fieldErrors?: FileFieldErrors
  error?: string
  success?: boolean
  fileId?: string
  downloadUrl?: string
}
