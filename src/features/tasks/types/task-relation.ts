import type { FileRecord } from '@/features/files/types/file'
import type { InformationItem } from '@/features/information/types/information-item'
import type { Tables } from '@/lib/supabase/types'

export type TaskFileRelation = Tables<'task_file_relations'>

export type TaskInformationRelation = Tables<'task_information_relations'>

export type TaskLinkedFile = {
  relationId: string
  linkedAt: string
  file: FileRecord
  mediaUrl?: string | null
}

export type TaskLinkedInformation = {
  relationId: string
  linkedAt: string
  information: InformationItem
}

export type TaskRelationMutationState = {
  error?: string
  success?: boolean
}
