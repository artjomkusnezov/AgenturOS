export const FILES_STORAGE_BUCKET = 'user-files'

export const MAX_FILE_UPLOAD_BYTES = 50 * 1024 * 1024

export const SIGNED_DOWNLOAD_URL_EXPIRY_SECONDS = 60

export function buildStoragePath(userId: string): string {
  return `${userId}/${crypto.randomUUID()}`
}
