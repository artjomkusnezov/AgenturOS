/**
 * Human-selected origin of a pasted/typed working copy.
 * Not a new inbound channel — still `manual` / `plain_text`.
 */

import { KFZ_ACQUISITION_PRODUCT } from '@/features/inbound/kfz/lib/build-kfz-inquiry-metadata'
import {
  MANUAL_CAPTURE_ORIGIN_KIND_EMAIL_LABEL,
  MANUAL_CAPTURE_ORIGIN_KIND_NOTE_LABEL,
  MANUAL_CAPTURE_ORIGIN_KIND_PHONE_LABEL,
} from '@/features/inbound/manual/lib/manual-capture-copy'

export const MANUAL_CAPTURE_FAMILY = 'manual' as const
export const MANUAL_CAPTURE_KIND = 'plain_text' as const

export const MANUAL_CAPTURE_ORIGIN_KINDS = [
  'phone_call',
  'pasted_email',
  'personal_note',
] as const

export type ManualCaptureOriginKind = (typeof MANUAL_CAPTURE_ORIGIN_KINDS)[number]

export const MANUAL_CAPTURE_ORIGIN_KIND_LABELS = {
  phone_call: MANUAL_CAPTURE_ORIGIN_KIND_PHONE_LABEL,
  pasted_email: MANUAL_CAPTURE_ORIGIN_KIND_EMAIL_LABEL,
  personal_note: MANUAL_CAPTURE_ORIGIN_KIND_NOTE_LABEL,
} as const satisfies Record<ManualCaptureOriginKind, string>

export const MANUAL_CAPTURE_ORIGIN_KIND_OPTIONS = [
  { value: 'phone_call', label: MANUAL_CAPTURE_ORIGIN_KIND_PHONE_LABEL },
  { value: 'pasted_email', label: MANUAL_CAPTURE_ORIGIN_KIND_EMAIL_LABEL },
  { value: 'personal_note', label: MANUAL_CAPTURE_ORIGIN_KIND_NOTE_LABEL },
] as const satisfies ReadonlyArray<{
  value: ManualCaptureOriginKind
  label: string
}>

export type ManualCaptureMetadata = {
  family: typeof MANUAL_CAPTURE_FAMILY
  kind: typeof MANUAL_CAPTURE_KIND
  originKind: ManualCaptureOriginKind
  product?: typeof KFZ_ACQUISITION_PRODUCT
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isManualCaptureOriginKind(value: unknown): value is ManualCaptureOriginKind {
  return value === 'phone_call' || value === 'pasted_email' || value === 'personal_note'
}

export function parseManualCaptureOriginKind(value: unknown): ManualCaptureOriginKind | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return isManualCaptureOriginKind(trimmed) ? trimmed : null
}

export function parseManualKfzCaseChoice(value: unknown): boolean {
  return value === true || value === 'true' || value === 'on' || value === '1'
}

export function buildManualCaptureMetadata(
  originKind: ManualCaptureOriginKind,
  options?: { kfzCase?: boolean },
): { capture: ManualCaptureMetadata } {
  const capture: ManualCaptureMetadata = {
    family: MANUAL_CAPTURE_FAMILY,
    kind: MANUAL_CAPTURE_KIND,
    originKind,
  }

  if (options?.kfzCase) {
    capture.product = KFZ_ACQUISITION_PRODUCT
  }

  return { capture }
}

/** True only when an employee explicitly marked the working copy as Kfz. */
export function readManualKfzCaseChoice(metadata: unknown): boolean {
  if (!isRecord(metadata)) {
    return false
  }

  const capture = metadata.capture
  if (isRecord(capture) && capture.family === MANUAL_CAPTURE_FAMILY) {
    if (capture.product === KFZ_ACQUISITION_PRODUCT) {
      return true
    }
  }

  const acquisition = metadata.acquisition
  if (
    isRecord(acquisition) &&
    acquisition.family === MANUAL_CAPTURE_FAMILY &&
    acquisition.product === KFZ_ACQUISITION_PRODUCT
  ) {
    return true
  }

  return false
}

/** Reads the employee-chosen origin from provider-neutral inbound metadata. */
export function readManualCaptureOriginKind(metadata: unknown): ManualCaptureOriginKind | null {
  if (!isRecord(metadata)) {
    return null
  }

  const capture = metadata.capture
  if (!isRecord(capture)) {
    return null
  }

  if (capture.family !== MANUAL_CAPTURE_FAMILY) {
    return null
  }

  return parseManualCaptureOriginKind(capture.originKind)
}

export function getManualCaptureOriginKindLabel(originKind: ManualCaptureOriginKind): string {
  return MANUAL_CAPTURE_ORIGIN_KIND_LABELS[originKind]
}
