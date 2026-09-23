/**
 * Keep the one /kfz Server Action under Vercel's function body limit.
 * Files travel as binary multipart parts (React Flight `$B`), not base64.
 * Next.js `serverActions.bodySizeLimit` is 52mb and is not the binding cap:
 * Vercel rejects the function request above 4.5 MB with HTTP 413 before the
 * action runs. The landing catch then shows the technical transmission error.
 */

import { KFZ_LANDING_MAX_DOCUMENT_BYTES } from '@/features/inbound/kfz/lib/kfz-landing-documents'

/** https://vercel.com/docs/functions/limitations — request body of a Vercel Function. */
export const KFZ_VERCEL_FUNCTION_BODY_LIMIT_BYTES = 4_500_000

/** Multipart boundaries, Flight metadata and the JSON inquiry payload. */
export const KFZ_LANDING_ACTION_BODY_RESERVE_BYTES = 256 * 1024

export const KFZ_LANDING_ACTION_BODY_BUDGET_BYTES =
  KFZ_VERCEL_FUNCTION_BODY_LIMIT_BYTES - KFZ_LANDING_ACTION_BODY_RESERVE_BYTES

/** Already-small photos stay untouched so a 1×1 QA PNG is not re-encoded. */
export const KFZ_LANDING_IMAGE_PASSTHROUGH_BYTES = 1_200_000

export const KFZ_LANDING_TRANSPORT_TOO_LARGE_REASON =
  'Die Datei ist für die Übermittlung zu groß. Bitte ein kleineres Foto oder PDF wählen.'

const IMAGE_FIT_ATTEMPTS = [
  { maxEdge: 2400, quality: 0.82 },
  { maxEdge: 2000, quality: 0.75 },
  { maxEdge: 1600, quality: 0.7 },
  { maxEdge: 1280, quality: 0.65 },
  { maxEdge: 1024, quality: 0.6 },
] as const

export type KfzLandingImageFitAttempt = (typeof IMAGE_FIT_ATTEMPTS)[number]

export type KfzLandingImageEncoder = (
  file: File,
  attempt: KfzLandingImageFitAttempt,
) => Promise<Blob | null>

export type PrepareKfzLandingTransportFileResult =
  | { ok: true; file: File }
  | { ok: false; reason: string; code: 'oversized' }

export function remainingKfzLandingTransportBudget(existingBytes: number): number {
  if (!Number.isFinite(existingBytes) || existingBytes <= 0) {
    return KFZ_LANDING_ACTION_BODY_BUDGET_BYTES
  }
  return Math.max(0, KFZ_LANDING_ACTION_BODY_BUDGET_BYTES - existingBytes)
}

export function kfzLandingFilesFitTransport(files: readonly { size: number }[]): boolean {
  const total = files.reduce((sum, file) => sum + file.size, 0)
  return total <= KFZ_LANDING_ACTION_BODY_BUDGET_BYTES
}

function extensionOf(filename: string): string {
  const match = filename.toLowerCase().match(/(\.[a-z0-9]+)$/)
  return match?.[1] ?? ''
}

function isRasterImage(file: { type: string; name: string }): boolean {
  const mime = file.type.trim().toLowerCase()
  if (
    mime === 'image/jpeg' ||
    mime === 'image/jpg' ||
    mime === 'image/png' ||
    mime === 'image/webp' ||
    mime === 'image/heic' ||
    mime === 'image/heif'
  ) {
    return true
  }
  const extension = extensionOf(file.name)
  return (
    extension === '.jpg' ||
    extension === '.jpeg' ||
    extension === '.png' ||
    extension === '.webp' ||
    extension === '.heic' ||
    extension === '.heif'
  )
}

function jpegFilename(filename: string): string {
  const trimmed = filename.trim() || 'foto'
  const withoutExtension = trimmed.replace(/\.[a-z0-9]+$/i, '')
  return `${withoutExtension || 'foto'}.jpg`
}

function fitsBudget(size: number, budgetBytes: number): boolean {
  return size > 0 && size <= budgetBytes && size <= KFZ_LANDING_MAX_DOCUMENT_BYTES
}

export async function prepareKfzLandingFileForTransport(
  file: File,
  budgetBytes: number,
  encode: KfzLandingImageEncoder = encodeKfzLandingImageInBrowser,
): Promise<PrepareKfzLandingTransportFileResult> {
  if (budgetBytes <= 0) {
    return {
      ok: false,
      reason: KFZ_LANDING_TRANSPORT_TOO_LARGE_REASON,
      code: 'oversized',
    }
  }

  if (!isRasterImage(file)) {
    if (fitsBudget(file.size, budgetBytes)) {
      return { ok: true, file }
    }
    return {
      ok: false,
      reason: KFZ_LANDING_TRANSPORT_TOO_LARGE_REASON,
      code: 'oversized',
    }
  }

  if (file.size <= KFZ_LANDING_IMAGE_PASSTHROUGH_BYTES && fitsBudget(file.size, budgetBytes)) {
    return { ok: true, file }
  }

  if (file.size > KFZ_LANDING_MAX_DOCUMENT_BYTES) {
    return {
      ok: false,
      reason: 'Datei ist zu groß (maximal 8 MB).',
      code: 'oversized',
    }
  }

  for (const attempt of IMAGE_FIT_ATTEMPTS) {
    const encoded = await encode(file, attempt)
    if (!encoded || !fitsBudget(encoded.size, budgetBytes)) {
      continue
    }
    return {
      ok: true,
      file: new File([encoded], jpegFilename(file.name), {
        type: 'image/jpeg',
        lastModified: file.lastModified,
      }),
    }
  }

  if (fitsBudget(file.size, budgetBytes)) {
    return { ok: true, file }
  }

  return {
    ok: false,
    reason: KFZ_LANDING_TRANSPORT_TOO_LARGE_REASON,
    code: 'oversized',
  }
}

export async function encodeKfzLandingImageInBrowser(
  file: File,
  attempt: KfzLandingImageFitAttempt,
): Promise<Blob | null> {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    return null
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = longest > 0 ? Math.min(1, attempt.maxEdge / longest) : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      return null
    }
    context.drawImage(bitmap, 0, 0, width, height)
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', attempt.quality)
    })
  } finally {
    bitmap.close()
  }
}
