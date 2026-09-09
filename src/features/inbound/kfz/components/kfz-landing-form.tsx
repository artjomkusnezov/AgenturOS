'use client'

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
} from 'react'

import { submitKfzLandingInquiryAction } from '@/features/inbound/kfz/actions/submit-kfz-landing-inquiry'
import { KfzLandingDocumentFields } from '@/features/inbound/kfz/components/kfz-landing-document-fields'
import {
  type KfzLandingAttribution,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import {
  createKfzLandingDraftController,
  emptyKfzLandingDraftValues,
  getSessionKfzLandingDraftStorage,
  type KfzLandingDraftStorage,
} from '@/features/inbound/kfz/lib/kfz-landing-draft'
import {
  addKfzLandingDocuments,
  removeKfzLandingDocument,
  type KfzLandingDocumentCandidate,
  type KfzLandingDocumentRejection,
} from '@/features/inbound/kfz/lib/kfz-landing-documents'
import {
  KFZ_LANDING_CONFIRMATION_BODY,
  KFZ_LANDING_CONFIRMATION_TITLE,
  KFZ_LANDING_CONSENT_VERSION,
  KFZ_LANDING_CONTACT_EMAIL,
  KFZ_LANDING_CONTACT_PHONE,
  KFZ_LANDING_CONTACT_PHONE_E164,
  KFZ_LANDING_PRIVACY_URL,
} from '@/features/inbound/kfz/lib/kfz-landing-constants'
import {
  createKfzLandingSubmissionId,
  isKfzLandingSubmitLocked,
  kfzLandingSubmitStatus,
  kfzLandingSubmitStatusLabel,
  type KfzLandingSubmitPhase,
} from '@/features/inbound/kfz/lib/kfz-landing-submit-guard'
import {
  executeKfzLandingSubmitAttempt,
  type KfzLandingSubmitFn,
} from '@/features/inbound/kfz/lib/kfz-landing-submit-session'
import {
  canAdvanceKfzLandingStep,
  KFZ_LANDING_CHANNEL_CHOICES,
  KFZ_LANDING_REQUEST_TYPES,
  KFZ_LANDING_STEP_LABELS,
  nextKfzLandingStep,
  previousKfzLandingStep,
  type KfzLandingStep,
} from '@/features/inbound/kfz/lib/kfz-landing-steps'
import type {
  KfzPreferredChannel,
  KfzUploadGroup,
} from '@/features/inbound/kfz/types/public-kfz-inquiry'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

const INITIAL_VALUES: KfzLandingFormValues = emptyKfzLandingDraftValues()

type KfzLandingFormProps = {
  attribution?: KfzLandingAttribution
  submitInquiry?: KfzLandingSubmitFn
  draftStorage?: KfzLandingDraftStorage | null
  submitTimeoutMs?: number
}

const fieldClassName =
  'mt-1.5 w-full min-h-12 rounded-xl border border-[#cbd6e2] bg-white px-3.5 py-3 text-base text-zinc-900 outline-none transition focus:border-[#0050aa] focus:ring-2 focus:ring-[#0050aa]/20 disabled:cursor-not-allowed disabled:bg-zinc-100'

const labelClassName = 'block text-sm font-medium text-zinc-800'

function RequiredMark() {
  return (
    <span className="text-red-700" aria-hidden="true">
      {' '}
      *
    </span>
  )
}

function channelLabel(channel: KfzPreferredChannel): string {
  if (channel === 'whatsapp') {
    return 'WhatsApp'
  }
  if (channel === 'email') {
    return 'E-Mail'
  }
  return 'Telefon'
}

export function KfzLandingForm({
  attribution,
  submitInquiry = submitKfzLandingInquiryAction,
  draftStorage,
  submitTimeoutMs,
}: KfzLandingFormProps) {
  const formId = useId()
  const [localStep, setStep] = useState<KfzLandingStep | null>(null)
  const [localValues, setValues] = useState<KfzLandingFormValues | null>(null)
  const [documents, setDocuments] = useState<KfzLandingDocumentCandidate[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [rejections, setRejections] = useState<KfzLandingDocumentRejection[]>([])
  const [phase, setPhase] = useState<KfzLandingSubmitPhase>('idle')
  const [clientError, setClientError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [localDocumentNotice, setDocumentReselectNotice] = useState<string | null | undefined>(
    undefined,
  )
  const [isPending, startTransition] = useTransition()
  const generatedId = useMemo(() => createKfzLandingSubmissionId(), [])
  const inFlightRef = useRef(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const previewUrlsRef = useRef<Record<string, string>>({})
  const storage = draftStorage ?? getSessionKfzLandingDraftStorage()
  const draftController = useMemo(
    () => createKfzLandingDraftController(storage),
    [storage],
  )
  const restoredDraft = useSyncExternalStore(
    draftController.subscribe,
    draftController.read,
    () => null,
  )
  const step = localStep ?? restoredDraft?.step ?? 1
  const values = localValues ?? restoredDraft?.values ?? INITIAL_VALUES
  const documentReselectNotice =
    localDocumentNotice === undefined
      ? restoredDraft?.documentReselectNotice ?? null
      : localDocumentNotice
  const submissionId = restoredDraft?.submissionId ?? generatedId

  useEffect(() => {
    if (clientError || serverError) {
      errorRef.current?.focus()
    }
  }, [clientError, serverError])

  useEffect(() => {
    const urls = previewUrlsRef.current
    return () => {
      for (const url of Object.values(urls)) {
        URL.revokeObjectURL(url)
      }
    }
  }, [])

  const locked = isKfzLandingSubmitLocked(phase) || isPending
  const submitStatus = kfzLandingSubmitStatus(phase)
  const submitStatusLabel = kfzLandingSubmitStatusLabel(phase)

  function persistDraft(next: {
    step?: KfzLandingStep
    values?: KfzLandingFormValues
    documents?: readonly KfzLandingDocumentCandidate[]
    notice?: string | null
  } = {}) {
    if (phase === 'success') {
      return
    }
    const nextValues = next.values ?? values
    const nextStep = next.step ?? step
    const nextDocuments = next.documents ?? documents
    const nextNotice = next.notice === undefined ? documentReselectNotice : next.notice
    draftController.write({
      submissionId,
      step: nextStep,
      values: nextValues,
      hadDocuments: nextDocuments.length > 0 || Boolean(nextNotice),
    })
  }

  function updateField<K extends keyof KfzLandingFormValues>(
    key: K,
    value: KfzLandingFormValues[K],
  ) {
    const nextValues = { ...values, [key]: value }
    setClientError(null)
    setValues(nextValues)
    persistDraft({ values: nextValues })
  }

  function goNext() {
    setClientError(null)
    const check = canAdvanceKfzLandingStep(step, values)
    if (!check.ok) {
      setClientError(check.error)
      return
    }
    const next = nextKfzLandingStep(step)
    if (next) {
      setStep(next)
      persistDraft({ step: next })
    }
  }

  function goBack() {
    setClientError(null)
    const previous = previousKfzLandingStep(step)
    if (previous) {
      setStep(previous)
      persistDraft({ step: previous })
    }
  }

  function handleAddFiles(group: KfzUploadGroup, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return
    }

    const incoming = Array.from(fileList).map((file) => ({
      group,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      file,
    }))

    const added = addKfzLandingDocuments(
      documents,
      incoming.map((entry) => ({
        group: entry.group,
        filename: entry.filename,
        mimeType: entry.mimeType,
        sizeBytes: entry.sizeBytes,
      })),
    )
    setDocuments(added.documents)
    setRejections(added.rejected)
    setDocumentReselectNotice(null)
    persistDraft({ documents: added.documents, notice: null })

    const acceptedNames = new Set(
      added.documents
        .filter((doc) => !documents.some((current) => current.id === doc.id))
        .map((doc) => `${doc.group}:${doc.filename}:${doc.sizeBytes}`),
    )

    setPreviews((current) => {
      const next = { ...current }
      for (const entry of incoming) {
        const key = `${entry.group}:${entry.filename}:${entry.sizeBytes}`
        if (!acceptedNames.has(key) || !entry.file.type.startsWith('image/')) {
          continue
        }
        const match = added.documents.find(
          (doc) =>
            doc.group === entry.group &&
            doc.filename === entry.filename &&
            doc.sizeBytes === entry.sizeBytes &&
            !current[doc.id],
        )
        if (!match) {
          continue
        }
        const url = URL.createObjectURL(entry.file)
        previewUrlsRef.current[match.id] = url
        next[match.id] = url
      }
      return next
    })
  }

  function handleRemoveDocument(id: string) {
    const url = previewUrlsRef.current[id]
    if (url) {
      URL.revokeObjectURL(url)
      delete previewUrlsRef.current[id]
    }
    const nextDocuments = removeKfzLandingDocument(documents, id)
    setDocuments(nextDocuments)
    setPreviews((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setRejections([])
    persistDraft({ documents: nextDocuments })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setClientError(null)
    setServerError(null)

    if (step !== 3) {
      goNext()
      return
    }

    if (inFlightRef.current) {
      return
    }

    const prepared = {
      submissionId,
      values,
      documents,
      previews,
    }

    persistDraft()
    inFlightRef.current = true
    setPhase('submitting')

    startTransition(async () => {
      try {
        const attempt = await executeKfzLandingSubmitAttempt({
          phase: 'idle',
          inFlight: false,
          prepared,
          attribution,
          submit: submitInquiry,
          timeoutMs: submitTimeoutMs,
        })

        if (attempt.locked) {
          setPhase(phase)
          return
        }

        if (!attempt.started) {
          setPhase('idle')
          setClientError(attempt.result?.ok === false ? attempt.result.error : null)
          return
        }

        if (attempt.phase === 'success') {
          draftController.clear()
          setPhase('success')
          setServerError(null)
          setValues(emptyKfzLandingDraftValues())
          setDocuments([])
          setPreviews({})
          setDocumentReselectNotice(null)
          return
        }

        setPhase('error')
        setServerError(
          attempt.result && !attempt.result.ok
            ? attempt.result.error
            : 'Die Anfrage konnte nicht übermittelt werden. Bitte versuchen Sie es erneut.',
        )
      } catch {
        setPhase('error')
        setServerError(
          'Technischer Fehler bei der Übermittlung. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.',
        )
      } finally {
        inFlightRef.current = false
      }
    })
  }

  if (phase === 'success') {
    return (
      <div
        className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 sm:p-6"
        data-kfz-submit-status="received"
      >
        <p className="sr-only" aria-live="polite">
          {submitStatusLabel}
        </p>
        <Alert variant="success">
          <p className="text-lg font-semibold text-emerald-900">
            {KFZ_LANDING_CONFIRMATION_TITLE}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/90">
            {KFZ_LANDING_CONFIRMATION_BODY}
          </p>
        </Alert>
        <p className="text-sm text-zinc-600">
          Fragen zwischendurch?{' '}
          <a
            className="font-medium text-blue-800 underline-offset-2 hover:underline"
            href={`mailto:${KFZ_LANDING_CONTACT_EMAIL}`}
          >
            {KFZ_LANDING_CONTACT_EMAIL}
          </a>
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
      aria-describedby={`${formId}-privacy`}
      data-kfz-submit-status={submitStatus}
    >
      <div aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">
          Schritt {step} von 3 · {KFZ_LANDING_STEP_LABELS[step]}
        </p>
        <ol className="mt-2 grid grid-cols-3 gap-1.5" aria-label="Fortschritt">
          {([1, 2, 3] as const).map((item) => (
            <li
              key={item}
              className={`h-1.5 rounded-full ${
                item <= step ? 'bg-blue-800' : 'bg-zinc-200'
              }`}
            >
              <span className="sr-only">
                {KFZ_LANDING_STEP_LABELS[item]}
                {item === step ? ' (aktuell)' : item < step ? ' (erledigt)' : ''}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {step === 1 ? (
        <fieldset className="space-y-2">
          <legend className="text-base font-semibold text-zinc-900">
            Worum geht es?
            <RequiredMark />
          </legend>
          <p className="text-sm text-zinc-600">
            Eine Auswahl reicht. Wechseln ist unser häufigster Check.
          </p>
          <div className="grid gap-2">
            {KFZ_LANDING_REQUEST_TYPES.map((requestType) => {
              const selected = values.inquiryReason === requestType.label
              return (
                <label
                  key={requestType.id}
                  className={`relative flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-base font-medium transition ${
                    selected
                      ? 'border-[#0050aa] bg-[#eaf3ff] text-[#003781] ring-1 ring-[#0050aa]'
                      : requestType.id === 'switch'
                        ? 'border-[#8eb6e5] bg-[#f5f9ff] text-[#003781] hover:border-[#0050aa]'
                        : 'border-zinc-200 bg-white text-zinc-900 hover:border-[#8eb6e5] hover:bg-[#f8fbff]'
                  }`}
                >
                  <input
                    type="radio"
                    name="inquiryReason"
                    className="sr-only"
                    checked={selected}
                    disabled={locked}
                    onChange={() => updateField('inquiryReason', requestType.label)}
                  />
                  <span>{requestType.label}</span>
                  {requestType.id === 'switch' ? (
                    <span className="rounded-full bg-[#d7eaff] px-2.5 py-1 text-xs font-semibold text-[#0050aa]">
                      Am häufigsten
                    </span>
                  ) : null}
                </label>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div>
            <label className={labelClassName} htmlFor={`${formId}-fullName`}>
              Name
              <RequiredMark />
            </label>
            <input
              id={`${formId}-fullName`}
              name="fullName"
              autoComplete="name"
              required
              aria-required="true"
              disabled={locked}
              className={fieldClassName}
              value={values.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor={`${formId}-postalCode`}>
                PLZ
                <RequiredMark />
              </label>
              <input
                id={`${formId}-postalCode`}
                name="postalCode"
                autoComplete="postal-code"
                inputMode="numeric"
                required
                aria-required="true"
                disabled={locked}
                className={fieldClassName}
                value={values.postalCode}
                onChange={(e) => updateField('postalCode', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor={`${formId}-city`}>
                Ort
                <RequiredMark />
              </label>
              <input
                id={`${formId}-city`}
                name="city"
                autoComplete="address-level2"
                required
                aria-required="true"
                disabled={locked}
                className={fieldClassName}
                value={values.city}
                onChange={(e) => updateField('city', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClassName} htmlFor={`${formId}-phone`}>
              Telefon
              {values.preferredChannel === 'whatsapp' ? <RequiredMark /> : null}
            </label>
            <input
              id={`${formId}-phone`}
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              disabled={locked}
              placeholder="+49 …"
              className={fieldClassName}
              value={values.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              aria-describedby={`${formId}-contact-hint`}
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor={`${formId}-email`}>
              E-Mail
            </label>
            <input
              id={`${formId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              disabled={locked}
              className={fieldClassName}
              value={values.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-zinc-800">
              Wie dürfen wir uns melden?
            </legend>
            <p id={`${formId}-contact-hint`} className="mt-1 text-xs leading-relaxed text-zinc-500">
              Wir speichern nur Ihre Wahl. Es wird keine WhatsApp-Nachricht gesendet und
              keine Werbung daraus abgeleitet.
            </p>
            <div className="mt-2 grid gap-2">
              {KFZ_LANDING_CHANNEL_CHOICES.map((choice) => {
                const selected = values.preferredChannel === choice.value
                return (
                  <label
                    key={choice.value}
                    className={`flex min-h-12 cursor-pointer items-center rounded-2xl border px-4 py-3 text-base font-medium ${
                      selected
                        ? 'border-blue-800 bg-blue-50 text-blue-950'
                        : 'border-zinc-200 bg-white text-zinc-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="preferredChannel"
                      className="sr-only"
                      checked={selected}
                      disabled={locked}
                      onChange={() => updateField('preferredChannel', choice.value)}
                    />
                    {choice.label}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <p className="rounded-xl bg-[#f3f7fb] px-3.5 py-3 text-xs leading-relaxed text-[#4a5565]">
            Ihre Angaben verwenden wir ausschließlich zur Bearbeitung Ihrer Anfrage.
            Unterlagen fragen wir nur an, wenn sie für die Prüfung benötigt werden.{' '}
            <a
              href={KFZ_LANDING_PRIVACY_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#0050aa] underline-offset-2 hover:underline"
            >
              Datenschutz
            </a>
          </p>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3">
            <h3 className="text-sm font-semibold text-zinc-900">Kurz prüfen</h3>
            <dl className="mt-2 space-y-1.5 text-sm text-zinc-700">
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">Anliegen</dt>
                <dd>{values.inquiryReason || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">Kontakt</dt>
                <dd>
                  {values.fullName.trim() || '—'}
                  {values.postalCode || values.city
                    ? ` · ${values.postalCode} ${values.city}`.trim()
                    : ''}
                </dd>
                <dd className="text-zinc-600">
                  {channelLabel(values.preferredChannel)}
                  {values.phone.trim() ? ` · ${values.phone.trim()}` : ''}
                  {values.email.trim() ? ` · ${values.email.trim()}` : ''}
                </dd>
              </div>
            </dl>
          </div>

          {documentReselectNotice ? (
            <Alert variant="warning">
              <p className="font-medium">Unterlagen erneut auswählen</p>
              <p className="mt-1 text-sm">{documentReselectNotice}</p>
            </Alert>
          ) : null}

          <KfzLandingDocumentFields
            documents={documents}
            previews={previews}
            rejections={rejections}
            disabled={locked}
            onAddFiles={handleAddFiles}
            onRemove={handleRemoveDocument}
          />

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3">
            <div className="flex items-start gap-3">
              <input
                id={`${formId}-consent`}
                name="inquiryProcessingConsent"
                type="checkbox"
                required
                aria-required="true"
                disabled={locked}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-zinc-400 text-blue-800 focus:ring-blue-700"
                checked={values.inquiryProcessingConsent}
                onChange={(e) => updateField('inquiryProcessingConsent', e.target.checked)}
              />
              <label
                htmlFor={`${formId}-consent`}
                className="min-h-11 text-sm leading-relaxed text-zinc-700"
              >
                Ich willige ein, dass Allianz Kusnezov meine Angaben zur Bearbeitung dieser
                Kfz-Anfrage speichert und mich dazu kontaktiert. Es handelt sich nicht um
                eine Einwilligung für Werbung. Details:{' '}
                <a
                  href={KFZ_LANDING_PRIVACY_URL}
                  className="font-medium text-blue-800 underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Datenschutz
                </a>
                .
                <RequiredMark />
              </label>
            </div>
            <p id={`${formId}-privacy`} className="mt-3 text-xs leading-relaxed text-zinc-500">
              Ihre Angaben verwenden wir ausschließlich zur Bearbeitung Ihrer Anfrage.
              Unterlagen bleiben optional und werden nur benötigt, wenn sie die persönliche
              Prüfung erleichtern. Consent-Stand: {KFZ_LANDING_CONSENT_VERSION}.
            </p>
          </div>
        </div>
      ) : null}

      {(clientError || serverError) && (
        <div ref={errorRef} tabIndex={-1} className="outline-none">
          <Alert variant="error">
            <p className="font-medium">
              {serverError ? 'Anfrage nicht gespeichert' : 'Bitte Angaben prüfen'}
            </p>
            <p className="mt-1 text-sm">{clientError ?? serverError}</p>
            {serverError ? (
              <p className="mt-2 text-sm">
                Sie können es erneut versuchen oder uns direkt unter{' '}
                <a
                  className="font-medium underline-offset-2 hover:underline"
                  href={`mailto:${KFZ_LANDING_CONTACT_EMAIL}`}
                >
                  {KFZ_LANDING_CONTACT_EMAIL}
                </a>{' '}
                erreichen. Alternativ telefonisch unter{' '}
                <a
                  className="font-medium underline-offset-2 hover:underline"
                  href={`tel:${KFZ_LANDING_CONTACT_PHONE_E164}`}
                >
                  {KFZ_LANDING_CONTACT_PHONE}
                </a>
                .
              </p>
            ) : null}
          </Alert>
        </div>
      )}

      <p
        className={`text-sm ${
          submitStatus === 'failed'
            ? 'font-medium text-red-800'
            : submitStatus === 'sending'
              ? 'font-medium text-blue-800'
              : 'text-zinc-600'
        }`}
        aria-live="polite"
        data-kfz-submit-label={submitStatus}
      >
        {submitStatusLabel}
      </p>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        {step > 1 ? (
          <Button
            type="button"
            variant="secondary-lg"
            disabled={locked}
            onClick={goBack}
            className="min-h-12 flex-1 sm:flex-none"
          >
            Zurück
          </Button>
        ) : null}
        {step < 3 ? (
          <Button
            type="button"
            variant="primary-lg"
            disabled={locked}
            onClick={goNext}
            className="min-h-12 flex-1 sm:flex-none"
          >
            Weiter
          </Button>
        ) : (
          <Button
            type="submit"
            variant="primary-lg"
            disabled={locked}
            aria-busy={phase === 'submitting' || isPending}
            className="min-h-12 flex-1 sm:flex-none"
          >
            {phase === 'submitting' || isPending
              ? submitStatusLabel
              : phase === 'error'
                ? 'Erneut senden'
                : 'Unverbindliche Anfrage senden'}
          </Button>
        )}
      </div>
    </form>
  )
}
