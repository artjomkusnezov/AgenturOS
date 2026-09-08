/**
 * Client draft for the public Kfz landing.
 * Restores ordinary text/select fields and a stable submissionId.
 * Never persists consent as checked and never stores file bytes.
 */

import type { KfzLandingFormValues } from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import {
  KFZ_LANDING_DEFAULT_CITY,
  KFZ_LANDING_DEFAULT_POSTAL_CODE,
} from '@/features/inbound/kfz/lib/kfz-landing-constants'
import { KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL } from '@/features/inbound/kfz/lib/kfz-landing-steps'
import type { KfzLandingStep } from '@/features/inbound/kfz/lib/kfz-landing-steps'
import { KFZ_PREFERRED_CHANNELS } from '@/features/inbound/kfz/types/public-kfz-inquiry'

export const KFZ_LANDING_DRAFT_STORAGE_KEY = 'agenturos.kfz-landing.draft.v1' as const

export const KFZ_LANDING_DOCUMENT_RESELECT_NOTICE =
  'Nach dem Neuladen müssen Unterlagen erneut ausgewählt werden. Dateien werden vom Browser nicht wiederhergestellt und wurden nicht gespeichert.' as const

export type KfzLandingDraftStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type KfzLandingDraftSnapshot = {
  version: 1
  submissionId: string
  step: KfzLandingStep
  values: Omit<KfzLandingFormValues, 'inquiryProcessingConsent'>
  hadDocuments: boolean
}

export type RestoreKfzLandingDraftResult = {
  snapshot: KfzLandingDraftSnapshot
  values: KfzLandingFormValues
  step: KfzLandingStep
  submissionId: string
  documentReselectRequired: boolean
  documentReselectNotice: string | null
}

const DRAFT_STEPS = new Set<KfzLandingStep>([1, 2, 3])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function isKfzLandingStep(value: unknown): value is KfzLandingStep {
  return value === 1 || value === 2 || value === 3 || DRAFT_STEPS.has(value as KfzLandingStep)
}

export function createMemoryKfzLandingDraftStorage(
  seed: Record<string, string> = {},
): KfzLandingDraftStorage & { data: Record<string, string> } {
  const data = { ...seed }
  return {
    data,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
    },
    setItem(key, value) {
      data[key] = value
    },
    removeItem(key) {
      delete data[key]
    },
  }
}

export function getSessionKfzLandingDraftStorage(): KfzLandingDraftStorage | null {
  if (typeof sessionStorage === 'undefined') {
    return null
  }
  return sessionStorage
}

export function emptyKfzLandingDraftValues(): KfzLandingFormValues {
  return {
    fullName: '',
    postalCode: KFZ_LANDING_DEFAULT_POSTAL_CODE,
    city: KFZ_LANDING_DEFAULT_CITY,
    phone: '',
    email: '',
    preferredChannel: KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL,
    inquiryReason: '',
    inquiryProcessingConsent: false,
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    contextNotes: '',
  }
}

export function buildKfzLandingDraftSnapshot(input: {
  submissionId: string
  step: KfzLandingStep
  values: KfzLandingFormValues
  hadDocuments: boolean
}): KfzLandingDraftSnapshot | null {
  const submissionId = input.submissionId.trim()
  if (!submissionId || !isKfzLandingStep(input.step)) {
    return null
  }

  const preferredChannel =
    (KFZ_PREFERRED_CHANNELS as readonly string[]).includes(input.values.preferredChannel)
      ? input.values.preferredChannel
      : KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL

  return {
    version: 1,
    submissionId,
    step: input.step,
    hadDocuments: input.hadDocuments === true,
    values: {
      fullName: input.values.fullName,
      postalCode: input.values.postalCode,
      city: input.values.city,
      phone: input.values.phone,
      email: input.values.email,
      preferredChannel,
      inquiryReason: input.values.inquiryReason,
      vehicleMake: input.values.vehicleMake,
      vehicleModel: input.values.vehicleModel,
      vehicleYear: input.values.vehicleYear,
      contextNotes: input.values.contextNotes,
    },
  }
}

export function parseKfzLandingDraftSnapshot(
  raw: unknown,
): KfzLandingDraftSnapshot | null {
  const source =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw) as unknown
          } catch {
            return null
          }
        })()
      : raw

  if (!isRecord(source) || source.version !== 1) {
    return null
  }

  const submissionId = readString(source.submissionId).trim()
  if (!submissionId || !isKfzLandingStep(source.step) || !isRecord(source.values)) {
    return null
  }

  const preferredRaw = readString(source.values.preferredChannel)
  const preferredChannel =
    (KFZ_PREFERRED_CHANNELS as readonly string[]).includes(preferredRaw)
      ? (preferredRaw as KfzLandingFormValues['preferredChannel'])
      : KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL

  return {
    version: 1,
    submissionId,
    step: source.step,
    hadDocuments: source.hadDocuments === true,
    values: {
      fullName: readString(source.values.fullName),
      postalCode: readString(source.values.postalCode),
      city: readString(source.values.city),
      phone: readString(source.values.phone),
      email: readString(source.values.email),
      preferredChannel,
      inquiryReason: readString(source.values.inquiryReason),
      vehicleMake: readString(source.values.vehicleMake),
      vehicleModel: readString(source.values.vehicleModel),
      vehicleYear: readString(source.values.vehicleYear),
      contextNotes: readString(source.values.contextNotes),
    },
  }
}

/**
 * Restores typed fields. Consent is always unchecked — even if a hostile
 * snapshot tried to persist it as true. File bytes are never restored.
 */
export function restoreKfzLandingDraft(
  snapshot: KfzLandingDraftSnapshot,
): RestoreKfzLandingDraftResult {
  return {
    snapshot,
    submissionId: snapshot.submissionId,
    step: snapshot.step,
    values: {
      ...snapshot.values,
      inquiryProcessingConsent: false,
    },
    documentReselectRequired: snapshot.hadDocuments,
    documentReselectNotice: snapshot.hadDocuments
      ? KFZ_LANDING_DOCUMENT_RESELECT_NOTICE
      : null,
  }
}

export function readKfzLandingDraft(
  storage: KfzLandingDraftStorage | null | undefined,
): RestoreKfzLandingDraftResult | null {
  if (!storage) {
    return null
  }
  const parsed = parseKfzLandingDraftSnapshot(storage.getItem(KFZ_LANDING_DRAFT_STORAGE_KEY))
  if (!parsed) {
    return null
  }
  return restoreKfzLandingDraft(parsed)
}

export function writeKfzLandingDraft(
  storage: KfzLandingDraftStorage | null | undefined,
  input: {
    submissionId: string
    step: KfzLandingStep
    values: KfzLandingFormValues
    hadDocuments: boolean
  },
): KfzLandingDraftSnapshot | null {
  const snapshot = buildKfzLandingDraftSnapshot(input)
  if (!storage || !snapshot) {
    return snapshot
  }
  try {
    storage.setItem(KFZ_LANDING_DRAFT_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    return snapshot
  }
  return snapshot
}

export function clearKfzLandingDraft(
  storage: KfzLandingDraftStorage | null | undefined,
): void {
  if (!storage) {
    return
  }
  try {
    storage.removeItem(KFZ_LANDING_DRAFT_STORAGE_KEY)
  } catch {
    // Private mode / quota — ignore.
  }
}

export function draftPersistsConsentUnchecked(raw: string | KfzLandingDraftSnapshot): boolean {
  const snapshot = parseKfzLandingDraftSnapshot(raw)
  if (!snapshot) {
    return false
  }
  return !('inquiryProcessingConsent' in snapshot.values)
}

export type KfzLandingDraftController = {
  subscribe: (onStoreChange: () => void) => () => void
  read: () => RestoreKfzLandingDraftResult | null
  write: (input: {
    submissionId: string
    step: KfzLandingStep
    values: KfzLandingFormValues
    hadDocuments: boolean
  }) => KfzLandingDraftSnapshot | null
  clear: () => void
}

/**
 * External store for session draft restore. Used with useSyncExternalStore
 * so the form does not set React state inside an effect.
 */
export function createKfzLandingDraftController(
  storage: KfzLandingDraftStorage | null | undefined,
): KfzLandingDraftController {
  const listeners = new Set<() => void>()
  let cachedRaw: string | null | undefined
  let cached: RestoreKfzLandingDraftResult | null = null

  function emit() {
    cachedRaw = undefined
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    subscribe(onStoreChange) {
      listeners.add(onStoreChange)
      return () => {
        listeners.delete(onStoreChange)
      }
    },
    read() {
      if (!storage) {
        return null
      }
      const raw = storage.getItem(KFZ_LANDING_DRAFT_STORAGE_KEY)
      if (raw === cachedRaw) {
        return cached
      }
      cachedRaw = raw
      cached = readKfzLandingDraft(storage)
      return cached
    },
    write(input) {
      const previous = storage?.getItem(KFZ_LANDING_DRAFT_STORAGE_KEY) ?? null
      const snapshot = writeKfzLandingDraft(storage, input)
      const next = storage?.getItem(KFZ_LANDING_DRAFT_STORAGE_KEY) ?? null
      if (previous !== next) {
        emit()
      }
      return snapshot
    },
    clear() {
      clearKfzLandingDraft(storage)
      emit()
    },
  }
}
