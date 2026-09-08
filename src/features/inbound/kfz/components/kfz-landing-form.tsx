'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react'

import { submitKfzLandingInquiryAction } from '@/features/inbound/kfz/actions/submit-kfz-landing-inquiry'
import { KfzLandingDocumentFields } from '@/features/inbound/kfz/components/kfz-landing-document-fields'
import {
  buildKfzLandingPayload,
  type KfzLandingAttribution,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
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
  KFZ_LANDING_DEFAULT_CITY,
  KFZ_LANDING_DEFAULT_POSTAL_CODE,
} from '@/features/inbound/kfz/lib/kfz-landing-constants'
import {
  beginKfzLandingSubmit,
  createKfzLandingSubmissionId,
  isKfzLandingSubmitLocked,
  resolveKfzLandingSubmitResult,
  type KfzLandingSubmitPhase,
} from '@/features/inbound/kfz/lib/kfz-landing-submit-guard'
import {
  canAdvanceKfzLandingStep,
  KFZ_LANDING_CHANNEL_CHOICES,
  KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL,
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

const INITIAL_VALUES: KfzLandingFormValues = {
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

type KfzLandingFormProps = {
  attribution?: KfzLandingAttribution
}

const fieldClassName =
  'mt-1.5 w-full min-h-12 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 shadow-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 disabled:cursor-not-allowed disabled:bg-zinc-100'

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

export function KfzLandingForm({ attribution }: KfzLandingFormProps) {
  const formId = useId()
  const [step, setStep] = useState<KfzLandingStep>(1)
  const [values, setValues] = useState<KfzLandingFormValues>(INITIAL_VALUES)
  const [documents, setDocuments] = useState<KfzLandingDocumentCandidate[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [rejections, setRejections] = useState<KfzLandingDocumentRejection[]>([])
  const [phase, setPhase] = useState<KfzLandingSubmitPhase>('idle')
  const [clientError, setClientError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const submissionIdRef = useRef<string | null>(null)
  const inFlightRef = useRef(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const previewUrlsRef = useRef<Record<string, string>>({})

  useEffect(() => {
    submissionIdRef.current = createKfzLandingSubmissionId()
  }, [])

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

  function updateField<K extends keyof KfzLandingFormValues>(
    key: K,
    value: KfzLandingFormValues[K],
  ) {
    setClientError(null)
    setValues((prev) => ({ ...prev, [key]: value }))
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
    }
  }

  function goBack() {
    setClientError(null)
    const previous = previousKfzLandingStep(step)
    if (previous) {
      setStep(previous)
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
    setDocuments((current) => removeKfzLandingDocument(current, id))
    setPreviews((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setRejections([])
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

    const nextPhase = beginKfzLandingSubmit(phase)
    if (!nextPhase) {
      return
    }

    if (!submissionIdRef.current) {
      submissionIdRef.current = createKfzLandingSubmissionId()
    }

    const built = buildKfzLandingPayload({
      values,
      submissionId: submissionIdRef.current,
      consentTimestamp: new Date().toISOString(),
      attribution,
      documents,
    })

    if (!built.ok) {
      setClientError(built.error)
      return
    }

    inFlightRef.current = true
    setPhase(nextPhase)

    startTransition(async () => {
      try {
        const result = await submitKfzLandingInquiryAction(built.payload)
        if (result.ok) {
          setPhase(resolveKfzLandingSubmitResult('submitting', 'success'))
          setServerError(null)
          return
        }
        setPhase(resolveKfzLandingSubmitResult('submitting', 'error'))
        setServerError(
          result.error ||
            'Die Anfrage konnte nicht übermittelt werden. Bitte versuchen Sie es erneut.',
        )
      } catch {
        setPhase(resolveKfzLandingSubmitResult('submitting', 'error'))
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
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 sm:p-6">
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
            Eine Auswahl reicht. Wir prüfen persönlich und unverbindlich.
          </p>
          <div className="grid gap-2">
            {KFZ_LANDING_REQUEST_TYPES.map((requestType) => {
              const selected = values.inquiryReason === requestType.label
              return (
                <label
                  key={requestType.id}
                  className={`flex min-h-14 cursor-pointer items-center rounded-2xl border px-4 py-3 text-base font-medium ${
                    selected
                      ? 'border-blue-800 bg-blue-50 text-blue-950'
                      : 'border-zinc-200 bg-white text-zinc-900'
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
                  {requestType.label}
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
              Bevorzugter Rückruf
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
                  href="/datenschutz"
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
              Pflichtfelder sind Name, PLZ, Ort, Anliegen, Consent sowie ein Kontaktweg.
              Für WhatsApp ist eine nutzbare Telefonnummer nötig. Consent-Stand:{' '}
              {KFZ_LANDING_CONSENT_VERSION}. Es werden keine Preisversprechen oder KI-Tarife
              angezeigt. Unterlagen bleiben optional; dauerhaft gespeichert werden nur
              Dateiname, Typ, Größe und Gruppe.
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
                erreichen.
              </p>
            ) : null}
          </Alert>
        </div>
      )}

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
              ? 'Wird gesendet …'
              : 'Unverbindliche Anfrage senden'}
          </Button>
        )}
      </div>
    </form>
  )
}
