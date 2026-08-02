import type { FileRecord } from '@/features/files/types/file'
import type { Tables } from '@/lib/supabase/types'

export type InformationItem = Tables<'information_items'>

export type InformationLinkedFile = {
  relationId: string
  linkedAt: string
  displayOrder: number
  /** null, wenn die Dateimetadaten nicht geladen werden konnten. */
  file: FileRecord | null
  /**
   * Kurzlebige Signed URL für Inline-Darstellung.
   * Nur gesetzt, wenn die Datei inline gerendert werden soll und die URL erzeugt werden konnte.
   */
  mediaUrl?: string | null
}

export type InformationFieldErrors = {
  title?: string
  content?: string
}

export type InformationMutationState = {
  fieldErrors?: InformationFieldErrors
  error?: string
  success?: boolean
  itemId?: string
}

export type InformationInput = {
  title: string
  content: string
}
