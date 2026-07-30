import { createClient } from '@/lib/supabase/server'
import {
  buildStoragePath,
  FILES_STORAGE_BUCKET,
  SIGNED_DOWNLOAD_URL_EXPIRY_SECONDS,
} from '@/features/files/lib/file-storage'
import { sortFiles } from '@/features/files/lib/sort-files'
import { normalizeUploadFilename, resolveUploadMimeType } from '@/features/files/lib/validate-file'
import type { FileRecord } from '@/features/files/types/file'

type RepositoryError = {
  success: false
  error: string
}

type ListFilesResult =
  | { success: true; files: FileRecord[] }
  | RepositoryError

type FileResult =
  | { success: true; file: FileRecord }
  | RepositoryError

type DeleteFileResult =
  | { success: true }
  | RepositoryError

type DownloadFileResult =
  | { success: true; downloadUrl: string }
  | RepositoryError

type FileMetadataInput = {
  filename: string
  storage_path: string
  mime_type: string
  size_bytes: number
}

async function getAuthenticatedUserId(): Promise<
  { success: true; userId: string } | RepositoryError
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      success: false,
      error: 'Sie sind nicht angemeldet.',
    }
  }

  return {
    success: true,
    userId: user.id,
  }
}

export async function listFilesForCurrentUser(): Promise<ListFilesResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', authResult.userId)

  if (error) {
    return {
      success: false,
      error: 'Die Dateien konnten nicht geladen werden.',
    }
  }

  return {
    success: true,
    files: sortFiles(data),
  }
}

export async function getFileForCurrentUser(fileId: string): Promise<FileResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .eq('user_id', authResult.userId)
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Datei konnte nicht geladen werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Datei wurde nicht gefunden.',
    }
  }

  return {
    success: true,
    file: data,
  }
}

export async function createFileMetadataForCurrentUser(
  input: FileMetadataInput
): Promise<FileResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('files')
    .insert({
      user_id: authResult.userId,
      filename: input.filename,
      storage_path: input.storage_path,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
    })
    .select('*')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: 'Die Datei konnte nicht gespeichert werden.',
    }
  }

  return {
    success: true,
    file: data,
  }
}

export async function deleteFileMetadataForCurrentUser(
  fileId: string
): Promise<DeleteFileResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId)
    .eq('user_id', authResult.userId)
    .select('id')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Datei konnte nicht gelöscht werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Datei wurde nicht gefunden.',
    }
  }

  return {
    success: true,
  }
}

export async function uploadFileToStorage(
  storagePath: string,
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<{ success: true } | RepositoryError> {
  const supabase = await createClient()
  const { error } = await supabase.storage.from(FILES_STORAGE_BUCKET).upload(storagePath, fileBuffer, {
    contentType: mimeType,
    upsert: false,
  })

  if (error) {
    return {
      success: false,
      error: 'Die Datei konnte nicht hochgeladen werden.',
    }
  }

  return { success: true }
}

export async function deleteFileFromStorage(
  storagePath: string
): Promise<{ success: true } | RepositoryError> {
  const supabase = await createClient()
  const { error } = await supabase.storage.from(FILES_STORAGE_BUCKET).remove([storagePath])

  if (error) {
    return {
      success: false,
      error: 'Die Datei konnte im Speicher nicht entfernt werden.',
    }
  }

  return { success: true }
}

export async function createSignedDownloadUrlForCurrentUser(
  fileId: string
): Promise<DownloadFileResult> {
  const fileResult = await getFileForCurrentUser(fileId)

  if (!fileResult.success) {
    return fileResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(FILES_STORAGE_BUCKET)
    .createSignedUrl(fileResult.file.storage_path, SIGNED_DOWNLOAD_URL_EXPIRY_SECONDS)

  if (error || !data?.signedUrl) {
    return {
      success: false,
      error: 'Der Download konnte nicht vorbereitet werden.',
    }
  }

  return {
    success: true,
    downloadUrl: data.signedUrl,
  }
}

export async function uploadFileForCurrentUser(
  file: File
): Promise<FileResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const filename = normalizeUploadFilename(file.name)
  const mimeType = resolveUploadMimeType(file)
  const storagePath = buildStoragePath(authResult.userId)
  const fileBuffer = await file.arrayBuffer()

  const uploadResult = await uploadFileToStorage(storagePath, fileBuffer, mimeType)

  if (!uploadResult.success) {
    return uploadResult
  }

  const metadataResult = await createFileMetadataForCurrentUser({
    filename,
    storage_path: storagePath,
    mime_type: mimeType,
    size_bytes: file.size,
  })

  if (!metadataResult.success) {
    await deleteFileFromStorage(storagePath)
    return metadataResult
  }

  return metadataResult
}

export async function deleteFileForCurrentUser(fileId: string): Promise<DeleteFileResult> {
  const fileResult = await getFileForCurrentUser(fileId)

  if (!fileResult.success) {
    return fileResult
  }

  const storageResult = await deleteFileFromStorage(fileResult.file.storage_path)

  if (!storageResult.success) {
    return storageResult
  }

  const metadataResult = await deleteFileMetadataForCurrentUser(fileId)

  if (!metadataResult.success) {
    return {
      success: false,
      error: 'Die Dateimetadaten konnten nicht entfernt werden.',
    }
  }

  return {
    success: true,
  }
}
