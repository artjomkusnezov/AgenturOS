'use client'

import { useActionState, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { CaptureDialogShell } from '@/features/capture/components/capture-dialog-shell'
import { buildInboxHref } from '@/features/inbox/lib/kfz-work-queue'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import {
  confirmManualCaptureAction,
  type ManualCaptureMutationState,
} from '@/features/inbound/manual/actions/confirm-manual-capture-action'
import { buildManualCaptureDraft } from '@/features/inbound/manual/lib/build-manual-capture-draft'
import {
  MANUAL_CAPTURE_BACK_LABEL,
  MANUAL_CAPTURE_CANCEL_LABEL,
  MANUAL_CAPTURE_CHANNEL_LABEL,
  MANUAL_CAPTURE_CHANNEL_VALUE,
  MANUAL_CAPTURE_CONFIRM_LABEL,
  MANUAL_CAPTURE_DIALOG_DESCRIPTION,
  MANUAL_CAPTURE_DIALOG_TITLE,
  MANUAL_CAPTURE_DUPLICATE_CREATE_ANYWAY_LABEL,
  MANUAL_CAPTURE_DUPLICATE_OPEN_LABEL,
  MANUAL_CAPTURE_EMPTY_ERROR,
  MANUAL_CAPTURE_FIELDS_HEADING,
  MANUAL_CAPTURE_KFZ_CASE_HINT,
  MANUAL_CAPTURE_KFZ_CASE_LABEL,
  MANUAL_CAPTURE_KFZ_CITY_LABEL,
  MANUAL_CAPTURE_KFZ_CLASSIFICATION_VALUE,
  MANUAL_CAPTURE_KFZ_CUSTOMER_LABEL,
  MANUAL_CAPTURE_KFZ_EMAIL_LABEL,
  MANUAL_CAPTURE_KFZ_FIELDS_HEADING,
  MANUAL_CAPTURE_KFZ_MISSING_HEADING,
  MANUAL_CAPTURE_KFZ_PHONE_LABEL,
  MANUAL_CAPTURE_KFZ_POSTAL_CODE_LABEL,
  MANUAL_CAPTURE_KFZ_PREFERRED_CHANNEL_LABEL,
  MANUAL_CAPTURE_KFZ_REASON_LABEL,
  MANUAL_CAPTURE_KFZ_VEHICLE_MAKE_LABEL,
  MANUAL_CAPTURE_KFZ_VEHICLE_MODEL_LABEL,
  MANUAL_CAPTURE_KFZ_VEHICLE_YEAR_LABEL,
  MANUAL_CAPTURE_KIND_LABEL,
  MANUAL_CAPTURE_KIND_VALUE,
  MANUAL_CAPTURE_NO_AUTO_ACTION,
  MANUAL_CAPTURE_ORIGIN_ADDRESS_LABEL,
  MANUAL_CAPTURE_ORIGIN_KIND_ERROR,
  MANUAL_CAPTURE_ORIGIN_KIND_HINT,
  MANUAL_CAPTURE_ORIGIN_KIND_LABEL,
  MANUAL_CAPTURE_ORIGIN_NAME_LABEL,
  MANUAL_CAPTURE_ORIGIN_UNCHANGED_HINT,
  MANUAL_CAPTURE_REVIEW_LABEL,
  MANUAL_CAPTURE_SENDER_LABEL,
  MANUAL_CAPTURE_SENDER_VALUE,
  MANUAL_CAPTURE_SOURCE_LABEL,
  MANUAL_CAPTURE_SOURCE_PLACEHOLDER,
  MANUAL_CAPTURE_TITLE_LABEL,
  MANUAL_FIELD_SUGGESTION_LABEL,
} from '@/features/inbound/manual/lib/manual-capture-copy'
import {
  MANUAL_CAPTURE_ORIGIN_KIND_OPTIONS,
  getManualCaptureOriginKindLabel,
  parseManualCaptureOriginKind,
  type ManualCaptureOriginKind,
} from '@/features/inbound/manual/lib/manual-capture-origin'
import { findLikelyManualCaptureDuplicate } from '@/features/inbound/manual/lib/find-likely-manual-capture-duplicate'
import { buildManualCapturePreviewInboxItem } from '@/features/inbound/manual/lib/manual-capture-preview'
import {
  originFromReviewFields,
  presentManualCaptureDraft,
  presentManualCaptureDuplicateWarning,
} from '@/features/inbound/manual/lib/present-manual-capture'
import {
  buildKfzMissingInformationChecklist,
  labelKfzMissingCount,
} from '@/features/inbox/lib/present-kfz-website-inbox'
import {
  aosAlertWarningClassName,
  aosBadgeNeutralSubduedClassName,
  aosBtnGhostLgClassName,
  aosBtnPrimaryLgClassName,
  aosBtnSecondaryLgClassName,
  aosFieldErrorSmClassName,
  aosInputLgClassName,
  aosLinkInlineClassName,
  aosTextLabelClassName,
  aosTextMetaClassName,
  aosTextareaClassName,
  aosWorkspaceMetaClassName,
} from '@/lib/design-system'

type ManualQuickCaptureDialogProps = {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  /** Local preview: persist in memory and skip the authenticated action. */
  onLocalConfirmed?: (item: InboxItem) => void
  reviewHrefBase?: string
  /** Inbox items already on screen — compared locally, never fetched from production. */
  existingItems?: InboxItem[]
}

type CaptureStep = 'compose' | 'review'

const initialState: ManualCaptureMutationState = {}

export function ManualQuickCaptureDialog({
  isOpen,
  onClose,
  triggerRef,
  onLocalConfirmed,
  reviewHrefBase = '/app/inbox',
  existingItems = [],
}: ManualQuickCaptureDialogProps) {
  const router = useRouter()
  const [step, setStep] = useState<CaptureStep>('compose')
  const [sourceText, setSourceText] = useState('')
  const [originKind, setOriginKind] = useState<ManualCaptureOriginKind | ''>('')
  const [kfzCase, setKfzCase] = useState(false)
  const [title, setTitle] = useState('')
  const [originDisplayName, setOriginDisplayName] = useState('')
  const [originAddress, setOriginAddress] = useState('')
  const [originAddressKind, setOriginAddressKind] = useState('')
  const [composeError, setComposeError] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [suggestionFlags, setSuggestionFlags] = useState({
    title: false,
    originName: false,
    originAddress: false,
  })
  const [kfzFields, setKfzFields] = useState({
    fullName: '',
    phone: '',
    email: '',
    postalCode: '',
    city: '',
    preferredChannel: '',
    inquiryReason: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
  })
  const [kfzSuggestionFlags, setKfzSuggestionFlags] = useState({
    fullName: false,
    phone: false,
    email: false,
    postalCode: false,
    city: false,
    preferredChannel: false,
    inquiryReason: false,
    vehicleMake: false,
    vehicleModel: false,
    vehicleYear: false,
  })
  const [isLocalPending, setIsLocalPending] = useState(false)
  const handledSuccessRef = useRef<string | null>(null)
  const [state, formAction, isPending] = useActionState(confirmManualCaptureAction, initialState)

  const resetForm = useCallback(() => {
    setStep('compose')
    setSourceText('')
    setOriginKind('')
    setKfzCase(false)
    setTitle('')
    setOriginDisplayName('')
    setOriginAddress('')
    setOriginAddressKind('')
    setComposeError(null)
    setLocalError(null)
    setSuggestionFlags({ title: false, originName: false, originAddress: false })
    setKfzFields({
      fullName: '',
      phone: '',
      email: '',
      postalCode: '',
      city: '',
      preferredChannel: '',
      inquiryReason: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: '',
    })
    setKfzSuggestionFlags({
      fullName: false,
      phone: false,
      email: false,
      postalCode: false,
      city: false,
      preferredChannel: false,
      inquiryReason: false,
      vehicleMake: false,
      vehicleModel: false,
      vehicleYear: false,
    })
    setIsLocalPending(false)
  }, [])

  const handleClose = useCallback(() => {
    if (isPending || isLocalPending) {
      return
    }

    resetForm()
    onClose()
  }, [isLocalPending, isPending, onClose, resetForm])

  useEffect(() => {
    if (!state.success || !state.itemId || handledSuccessRef.current === state.itemId) {
      return
    }

    handledSuccessRef.current = state.itemId
    const href = buildInboxHref({ itemId: state.itemId, basePath: reviewHrefBase })
    resetForm()
    onClose()
    router.refresh()
    router.push(href)
  }, [onClose, resetForm, reviewHrefBase, router, state.itemId, state.success])

  const openReview = useCallback(() => {
    const result = buildManualCaptureDraft(sourceText, { originKind, kfzCase })
    if (!result.ok) {
      setComposeError(result.error)
      return
    }

    const review = presentManualCaptureDraft(result.draft)
    setSourceText(result.draft.sourceText)
    setOriginKind(result.draft.originKind)
    setKfzCase(result.draft.kfzCase)
    setTitle(result.draft.proposed.title ?? '')
    setOriginDisplayName(result.draft.proposed.origin?.displayName ?? '')
    setOriginAddress(result.draft.proposed.origin?.address ?? '')
    setOriginAddressKind(result.draft.proposed.origin?.addressKind ?? '')
    setSuggestionFlags({
      title: Boolean(review.fields.find((field) => field.id === 'title')?.suggestion),
      originName: Boolean(review.fields.find((field) => field.id === 'originName')?.suggestion),
      originAddress: Boolean(
        review.fields.find((field) => field.id === 'originAddress')?.suggestion,
      ),
    })

    const kfz = review.kfz
    const valueFor = (id: string) => kfz?.fields.find((field) => field.id === id)?.value ?? ''
    const suggested = (id: string) =>
      Boolean(kfz?.fields.find((field) => field.id === id)?.suggestion)
    setKfzFields({
      fullName: valueFor('fullName') || (result.draft.proposed.origin?.displayName ?? ''),
      phone:
        valueFor('phone') ||
        (result.draft.proposed.origin?.addressKind === 'phone'
          ? (result.draft.proposed.origin.address ?? '')
          : ''),
      email:
        valueFor('email') ||
        (result.draft.proposed.origin?.addressKind === 'email'
          ? (result.draft.proposed.origin.address ?? '')
          : ''),
      postalCode: valueFor('postalCode'),
      city: valueFor('city'),
      preferredChannel: result.draft.kfzFacts?.preferredChannel ?? '',
      inquiryReason: valueFor('inquiryReason'),
      vehicleMake: valueFor('vehicleMake'),
      vehicleModel: valueFor('vehicleModel'),
      vehicleYear: valueFor('vehicleYear'),
    })
    setKfzSuggestionFlags({
      fullName: suggested('fullName'),
      phone: suggested('phone'),
      email: suggested('email'),
      postalCode: suggested('postalCode'),
      city: suggested('city'),
      preferredChannel: suggested('preferredChannel'),
      inquiryReason: suggested('inquiryReason'),
      vehicleMake: suggested('vehicleMake'),
      vehicleModel: suggested('vehicleModel'),
      vehicleYear: suggested('vehicleYear'),
    })
    setComposeError(null)
    setLocalError(null)
    setStep('review')
  }, [kfzCase, originKind, sourceText])

  const duplicateWarning = useMemo(() => {
    if (step !== 'review') {
      return null
    }

    const match = findLikelyManualCaptureDuplicate({
      sourceText,
      title,
      originAddress,
      originAddressKind,
      existingItems,
    })

    if (!match) {
      return null
    }

    return presentManualCaptureDuplicateWarning(
      match,
      buildInboxHref({ itemId: match.itemId, basePath: reviewHrefBase }),
    )
  }, [
    existingItems,
    originAddress,
    originAddressKind,
    reviewHrefBase,
    sourceText,
    step,
    title,
  ])

  const kfzMissing = useMemo(() => {
    if (step !== 'review' || !kfzCase) {
      return null
    }

    const vehicleLabel =
      [kfzFields.vehicleMake, kfzFields.vehicleModel, kfzFields.vehicleYear]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ') || null
    const locationLabel =
      [kfzFields.postalCode, kfzFields.city].map((part) => part.trim()).filter(Boolean).join(' ') ||
      null
    const checklist = buildKfzMissingInformationChecklist({
      phone: kfzFields.phone.trim() || null,
      email: kfzFields.email.trim() || null,
      preferredChannel: kfzFields.preferredChannel.trim() || null,
      reason: kfzFields.inquiryReason.trim() || null,
      vehicle: vehicleLabel,
      location: locationLabel,
    })
    const missingInformation = checklist.filter((item) => !item.present).map((item) => item.label)

    return {
      checklist,
      missingInformation,
      missingCount: missingInformation.length,
      missingCountLabel: labelKfzMissingCount(missingInformation.length),
    }
  }, [kfzCase, kfzFields, step])

  const handleLocalConfirm = useCallback(() => {
    if (isLocalPending) {
      return
    }

    setIsLocalPending(true)
    setLocalError(null)

    const preview = buildManualCapturePreviewInboxItem({
      sourceText,
      originKind,
      title,
      origin: originFromReviewFields({
        displayName: originDisplayName,
        address: originAddress,
        addressKind:
          originAddressKind === 'email' || originAddressKind === 'phone' || originAddressKind === 'other'
            ? originAddressKind
            : null,
      }),
      kfzCase,
      kfz: kfzCase
        ? {
            fullName: kfzFields.fullName,
            phone: kfzFields.phone,
            email: kfzFields.email,
            postalCode: kfzFields.postalCode,
            city: kfzFields.city,
            preferredChannel: kfzFields.preferredChannel,
            inquiryReason: kfzFields.inquiryReason,
            vehicleMake: kfzFields.vehicleMake,
            vehicleModel: kfzFields.vehicleModel,
            vehicleYear: kfzFields.vehicleYear,
          }
        : null,
    })

    setIsLocalPending(false)

    if ('error' in preview) {
      setLocalError(preview.error)
      return
    }

    resetForm()
    onClose()
    onLocalConfirmed?.(preview)
    router.push(buildInboxHref({ itemId: preview.id, basePath: reviewHrefBase }))
  }, [
    isLocalPending,
    onClose,
    onLocalConfirmed,
    originAddress,
    originAddressKind,
    originDisplayName,
    originKind,
    resetForm,
    reviewHrefBase,
    router,
    sourceText,
    title,
    kfzCase,
    kfzFields,
  ])

  const handleComposeSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      openReview()
    },
    [openReview],
  )

  const handleReviewSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      if (onLocalConfirmed) {
        event.preventDefault()
        handleLocalConfirm()
      }
    },
    [handleLocalConfirm, onLocalConfirmed],
  )

  const busy = isPending || isLocalPending

  const handleOpenExisting = useCallback(() => {
    if (!duplicateWarning || isPending || isLocalPending) {
      return
    }

    const href = duplicateWarning.href
    resetForm()
    onClose()
    router.push(href)
  }, [duplicateWarning, isLocalPending, isPending, onClose, resetForm, router])

  const sourceTextError =
    state.fieldErrors?.sourceText ??
    (composeError === MANUAL_CAPTURE_EMPTY_ERROR ? composeError : null)
  const originKindError =
    state.fieldErrors?.originKind ??
    (composeError === MANUAL_CAPTURE_ORIGIN_KIND_ERROR ? composeError : null)
  const globalError =
    state.error ??
    localError ??
    (composeError && composeError !== MANUAL_CAPTURE_EMPTY_ERROR && composeError !== MANUAL_CAPTURE_ORIGIN_KIND_ERROR
      ? composeError
      : null)

  const footer =
    step === 'compose' ? (
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleClose}
          disabled={busy}
          className={`${aosBtnGhostLgClassName} min-h-11`}
        >
          {MANUAL_CAPTURE_CANCEL_LABEL}
        </button>
        <button
          type="submit"
          form="manual-capture-compose-form"
          disabled={busy || sourceText.trim().length === 0 || originKind === ''}
          className={`${aosBtnPrimaryLgClassName} min-h-11`}
        >
          {MANUAL_CAPTURE_REVIEW_LABEL}
        </button>
      </div>
    ) : (
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          type="button"
          onClick={() => setStep('compose')}
          disabled={busy}
          className={`${aosBtnSecondaryLgClassName} min-h-11`}
        >
          {MANUAL_CAPTURE_BACK_LABEL}
        </button>
        {duplicateWarning ? (
          <>
            <button
              type="submit"
              form="manual-capture-review-form"
              disabled={busy}
              className={`${aosBtnSecondaryLgClassName} min-h-11`}
            >
              {busy ? 'Wird angelegt …' : MANUAL_CAPTURE_DUPLICATE_CREATE_ANYWAY_LABEL}
            </button>
            <button
              type="button"
              onClick={handleOpenExisting}
              disabled={busy}
              className={`${aosBtnPrimaryLgClassName} min-h-11`}
            >
              {MANUAL_CAPTURE_DUPLICATE_OPEN_LABEL}
            </button>
          </>
        ) : (
          <button
            type="submit"
            form="manual-capture-review-form"
            disabled={busy}
            className={`${aosBtnPrimaryLgClassName} min-h-11`}
          >
            {busy ? 'Wird angelegt …' : MANUAL_CAPTURE_CONFIRM_LABEL}
          </button>
        )}
      </div>
    )

  return (
    <CaptureDialogShell
      isOpen={isOpen}
      title={MANUAL_CAPTURE_DIALOG_TITLE}
      description={MANUAL_CAPTURE_DIALOG_DESCRIPTION}
      onClose={handleClose}
      closeDisabled={busy}
      triggerRef={triggerRef}
      footer={footer}
    >
      {step === 'compose' ? (
        <form
          id="manual-capture-compose-form"
          onSubmit={handleComposeSubmit}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
        >
          <OriginKindPicker
            value={originKind}
            onChange={setOriginKind}
            disabled={busy}
            error={originKindError}
          />
          <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-zinc-200/80 bg-white px-3 py-3">
            <input
              type="checkbox"
              name="kfzCase"
              checked={kfzCase}
              disabled={busy}
              onChange={(event) => setKfzCase(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-zinc-800"
            />
            <span>
              <span className={aosTextLabelClassName}>{MANUAL_CAPTURE_KFZ_CASE_LABEL}</span>
              <span className={`mt-1 block ${aosTextMetaClassName}`}>
                {MANUAL_CAPTURE_KFZ_CASE_HINT}
              </span>
            </span>
          </label>
          <div className="mt-5 flex flex-col gap-1.5">
            <label htmlFor="manual-capture-source" className={aosTextLabelClassName}>
              {MANUAL_CAPTURE_SOURCE_LABEL}
            </label>
            <textarea
              id="manual-capture-source"
              name="sourceText"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              disabled={busy}
              autoFocus
              rows={10}
              placeholder={MANUAL_CAPTURE_SOURCE_PLACEHOLDER}
              className={`${aosTextareaClassName} min-h-[10rem] text-base sm:text-sm`}
            />
            {sourceTextError ? <p className={aosFieldErrorSmClassName}>{sourceTextError}</p> : null}
          </div>
          <p className={`mt-3 ${aosWorkspaceMetaClassName}`}>{MANUAL_CAPTURE_NO_AUTO_ACTION}</p>
        </form>
      ) : (
        <form
          id="manual-capture-review-form"
          action={onLocalConfirmed ? undefined : formAction}
          onSubmit={handleReviewSubmit}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5"
        >
          <input type="hidden" name="sourceText" value={sourceText} />
          <input type="hidden" name="originKind" value={originKind} />
          <input type="hidden" name="originAddressKind" value={originAddressKind} />
          {kfzCase ? <input type="hidden" name="kfzCase" value="true" /> : null}

          {duplicateWarning ? (
            <div className={aosAlertWarningClassName} role="status">
              <p className="font-medium">{duplicateWarning.warning}</p>
              <p className="mt-1">{duplicateWarning.reasonLabel}</p>
              <p className="mt-2">
                <a
                  href={duplicateWarning.href}
                  className={aosLinkInlineClassName}
                  onClick={(event) => {
                    event.preventDefault()
                    handleOpenExisting()
                  }}
                >
                  {duplicateWarning.title}
                </a>
              </p>
              <p className={`mt-2 ${aosTextMetaClassName}`}>{duplicateWarning.decisionHint}</p>
            </div>
          ) : null}

          <section>
            <h3 className={aosTextLabelClassName}>{MANUAL_CAPTURE_SOURCE_LABEL}</h3>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-zinc-200/80 bg-zinc-50 px-3 py-3 text-sm text-zinc-800">
              {sourceText}
            </pre>
            <p className={`mt-2 ${aosTextMetaClassName}`}>{MANUAL_CAPTURE_ORIGIN_UNCHANGED_HINT}</p>
          </section>

          <section className="space-y-3">
            <h3 className={aosTextLabelClassName}>{MANUAL_CAPTURE_FIELDS_HEADING}</h3>

            <ReadonlyProposedField
              label={MANUAL_CAPTURE_ORIGIN_KIND_LABEL}
              value={originKind ? getManualCaptureOriginKindLabel(originKind) : ''}
            />
            <ReadonlyProposedField label={MANUAL_CAPTURE_CHANNEL_LABEL} value={MANUAL_CAPTURE_CHANNEL_VALUE} />
            <ReadonlyProposedField label={MANUAL_CAPTURE_KIND_LABEL} value={MANUAL_CAPTURE_KIND_VALUE} />

            <EditableProposedField
              id="manual-capture-title"
              name="title"
              label={MANUAL_CAPTURE_TITLE_LABEL}
              value={title}
              onChange={setTitle}
              disabled={busy}
              suggested={suggestionFlags.title}
            />
            <EditableProposedField
              id="manual-capture-origin-name"
              name="originDisplayName"
              label={MANUAL_CAPTURE_ORIGIN_NAME_LABEL}
              value={originDisplayName}
              onChange={setOriginDisplayName}
              disabled={busy}
              suggested={suggestionFlags.originName}
            />
            <EditableProposedField
              id="manual-capture-origin-address"
              name="originAddress"
              label={MANUAL_CAPTURE_ORIGIN_ADDRESS_LABEL}
              value={originAddress}
              onChange={setOriginAddress}
              disabled={busy}
              suggested={suggestionFlags.originAddress}
            />
            <ReadonlyProposedField label={MANUAL_CAPTURE_SENDER_LABEL} value={MANUAL_CAPTURE_SENDER_VALUE} />
          </section>

          {kfzCase ? (
            <section className="space-y-3">
              <h3 className={aosTextLabelClassName}>{MANUAL_CAPTURE_KFZ_FIELDS_HEADING}</h3>
              <p className={aosTextMetaClassName}>{MANUAL_CAPTURE_KFZ_CLASSIFICATION_VALUE}</p>
              <input type="hidden" name="kfzPreferredChannel" value={kfzFields.preferredChannel} />

              <EditableProposedField
                id="manual-capture-kfz-name"
                name="kfzFullName"
                label={MANUAL_CAPTURE_KFZ_CUSTOMER_LABEL}
                value={kfzFields.fullName}
                onChange={(value) => setKfzFields((current) => ({ ...current, fullName: value }))}
                disabled={busy}
                suggested={kfzSuggestionFlags.fullName}
              />
              <EditableProposedField
                id="manual-capture-kfz-phone"
                name="kfzPhone"
                label={MANUAL_CAPTURE_KFZ_PHONE_LABEL}
                value={kfzFields.phone}
                onChange={(value) => setKfzFields((current) => ({ ...current, phone: value }))}
                disabled={busy}
                suggested={kfzSuggestionFlags.phone}
              />
              <EditableProposedField
                id="manual-capture-kfz-email"
                name="kfzEmail"
                label={MANUAL_CAPTURE_KFZ_EMAIL_LABEL}
                value={kfzFields.email}
                onChange={(value) => setKfzFields((current) => ({ ...current, email: value }))}
                disabled={busy}
                suggested={kfzSuggestionFlags.email}
              />
              <EditableProposedField
                id="manual-capture-kfz-postal"
                name="kfzPostalCode"
                label={MANUAL_CAPTURE_KFZ_POSTAL_CODE_LABEL}
                value={kfzFields.postalCode}
                onChange={(value) => setKfzFields((current) => ({ ...current, postalCode: value }))}
                disabled={busy}
                suggested={kfzSuggestionFlags.postalCode}
              />
              <EditableProposedField
                id="manual-capture-kfz-city"
                name="kfzCity"
                label={MANUAL_CAPTURE_KFZ_CITY_LABEL}
                value={kfzFields.city}
                onChange={(value) => setKfzFields((current) => ({ ...current, city: value }))}
                disabled={busy}
                suggested={kfzSuggestionFlags.city}
              />
              <ReadonlyProposedField
                label={MANUAL_CAPTURE_KFZ_PREFERRED_CHANNEL_LABEL}
                value={
                  kfzFields.preferredChannel === 'phone'
                    ? 'Telefon'
                    : kfzFields.preferredChannel === 'email'
                      ? 'E-Mail'
                      : kfzFields.preferredChannel === 'whatsapp'
                        ? 'WhatsApp'
                        : ''
                }
                suggested={kfzSuggestionFlags.preferredChannel}
              />
              <EditableProposedField
                id="manual-capture-kfz-reason"
                name="kfzInquiryReason"
                label={MANUAL_CAPTURE_KFZ_REASON_LABEL}
                value={kfzFields.inquiryReason}
                onChange={(value) =>
                  setKfzFields((current) => ({ ...current, inquiryReason: value }))
                }
                disabled={busy}
                suggested={kfzSuggestionFlags.inquiryReason}
              />
              <EditableProposedField
                id="manual-capture-kfz-make"
                name="kfzVehicleMake"
                label={MANUAL_CAPTURE_KFZ_VEHICLE_MAKE_LABEL}
                value={kfzFields.vehicleMake}
                onChange={(value) => setKfzFields((current) => ({ ...current, vehicleMake: value }))}
                disabled={busy}
                suggested={kfzSuggestionFlags.vehicleMake}
              />
              <EditableProposedField
                id="manual-capture-kfz-model"
                name="kfzVehicleModel"
                label={MANUAL_CAPTURE_KFZ_VEHICLE_MODEL_LABEL}
                value={kfzFields.vehicleModel}
                onChange={(value) =>
                  setKfzFields((current) => ({ ...current, vehicleModel: value }))
                }
                disabled={busy}
                suggested={kfzSuggestionFlags.vehicleModel}
              />
              <EditableProposedField
                id="manual-capture-kfz-year"
                name="kfzVehicleYear"
                label={MANUAL_CAPTURE_KFZ_VEHICLE_YEAR_LABEL}
                value={kfzFields.vehicleYear}
                onChange={(value) => setKfzFields((current) => ({ ...current, vehicleYear: value }))}
                disabled={busy}
                suggested={kfzSuggestionFlags.vehicleYear}
              />

              {kfzMissing ? (
                <div>
                  <h4 className={aosTextLabelClassName}>{MANUAL_CAPTURE_KFZ_MISSING_HEADING}</h4>
                  <p className={`mt-1 ${aosTextMetaClassName}`}>{kfzMissing.missingCountLabel}</p>
                  <ul aria-label="Prüfliste fehlender Angaben" className="aos-kfz-checklist mt-2">
                    {kfzMissing.checklist.map((item) => (
                      <li
                        key={item.id}
                        className={
                          item.present
                            ? 'aos-kfz-check aos-kfz-check--present'
                            : 'aos-kfz-check aos-kfz-check--missing'
                        }
                      >
                        <span aria-hidden="true">{item.present ? '✓' : '○'}</span>
                        <span>{item.label}</span>
                        <span className="sr-only">{item.present ? 'vorhanden' : 'fehlt'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          <p className={aosWorkspaceMetaClassName}>{MANUAL_CAPTURE_NO_AUTO_ACTION}</p>
          {globalError ? <p className={aosFieldErrorSmClassName}>{globalError}</p> : null}
        </form>
      )}
    </CaptureDialogShell>
  )
}

function OriginKindPicker({
  value,
  onChange,
  disabled,
  error,
}: {
  value: ManualCaptureOriginKind | ''
  onChange: (value: ManualCaptureOriginKind) => void
  disabled: boolean
  error: string | null
}) {
  return (
    <fieldset>
      <legend className={aosTextLabelClassName}>{MANUAL_CAPTURE_ORIGIN_KIND_LABEL}</legend>
      <p className={`mt-1 ${aosTextMetaClassName}`}>{MANUAL_CAPTURE_ORIGIN_KIND_HINT}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={MANUAL_CAPTURE_ORIGIN_KIND_LABEL}>
        {MANUAL_CAPTURE_ORIGIN_KIND_OPTIONS.map((option) => {
          const selected = value === option.value
          return (
            <label
              key={option.value}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                selected
                  ? 'border-zinc-800 bg-zinc-50 text-zinc-900'
                  : 'border-zinc-200/80 bg-white text-zinc-700'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="originKind"
                value={option.value}
                checked={selected}
                disabled={disabled}
                onChange={(event) => {
                  const next = parseManualCaptureOriginKind(event.target.value)
                  if (next) {
                    onChange(next)
                  }
                }}
                className="h-4 w-4 accent-zinc-800"
              />
              <span>{option.label}</span>
            </label>
          )
        })}
      </div>
      {error ? <p className={`mt-1.5 ${aosFieldErrorSmClassName}`}>{error}</p> : null}
    </fieldset>
  )
}

function ReadonlyProposedField({
  label,
  value,
  suggested = false,
}: {
  label: string
  value: string
  suggested?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className={aosTextLabelClassName}>{label}</p>
        {suggested ? (
          <span className={aosBadgeNeutralSubduedClassName}>{MANUAL_FIELD_SUGGESTION_LABEL}</span>
        ) : null}
      </div>
      <p className={`rounded-xl border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-sm text-zinc-800`}>
        {value || '—'}
      </p>
    </div>
  )
}

function EditableProposedField({
  id,
  name,
  label,
  value,
  onChange,
  disabled,
  suggested,
}: {
  id: string
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  suggested: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className={aosTextLabelClassName}>
          {label}
        </label>
        {suggested ? (
          <span className={aosBadgeNeutralSubduedClassName}>{MANUAL_FIELD_SUGGESTION_LABEL}</span>
        ) : null}
      </div>
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={aosInputLgClassName}
      />
      {suggested ? (
        <p className={aosTextMetaClassName}>Kein KI-Entscheid — nur ein erkennbares Textmerkmal.</p>
      ) : null}
    </div>
  )
}
