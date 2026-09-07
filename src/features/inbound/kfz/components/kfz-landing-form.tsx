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
import {
  buildKfzLandingPayload,
  type KfzLandingAttribution,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import {
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
import type { KfzPreferredChannel } from '@/features/inbound/kfz/types/public-kfz-inquiry'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

const INITIAL_VALUES: KfzLandingFormValues = {
  fullName: '',
  postalCode: KFZ_LANDING_DEFAULT_POSTAL_CODE,
  city: KFZ_LANDING_DEFAULT_CITY,
  phone: '',
  email: '',
  preferredChannel: 'phone',
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
  'mt-1.5 w-full min-h-11 rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-zinc-100'

const labelClassName = 'block text-sm font-medium text-zinc-800'

function RequiredMark() {
  return (
    <span className="text-red-700" aria-hidden="true">
      {' '}
      *
    </span>
  )
}

export function KfzLandingForm({ attribution }: KfzLandingFormProps) {
  const formId = useId()
  const [values, setValues] = useState<KfzLandingFormValues>(INITIAL_VALUES)
  const [phase, setPhase] = useState<KfzLandingSubmitPhase>('idle')
  const [clientError, setClientError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const submissionIdRef = useRef<string | null>(null)
  const inFlightRef = useRef(false)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    submissionIdRef.current = createKfzLandingSubmissionId()
  }, [])

  useEffect(() => {
    if (clientError || serverError) {
      errorRef.current?.focus()
    }
  }, [clientError, serverError])

  const locked = isKfzLandingSubmitLocked(phase) || isPending

  function updateField<K extends keyof KfzLandingFormValues>(
    key: K,
    value: KfzLandingFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setClientError(null)
    setServerError(null)

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
      <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 sm:p-6">
        <Alert variant="success">
          <p className="font-semibold text-emerald-900">Anfrage eingegangen</p>
          <p className="mt-1 text-sm text-emerald-900/90">
            Vielen Dank. Wir haben Ihre Kfz-Anfrage erhalten und melden uns über den
            gewünschten Kontaktweg. Es erfolgt keine automatische Tarifeinschätzung —
            ein Berater prüft Ihre Angaben persönlich.
          </p>
        </Alert>
        <p className="text-sm text-zinc-600">
          Fragen zwischendurch?{' '}
          <a
            className="font-medium text-blue-700 underline-offset-2 hover:underline"
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
      <p className="text-xs text-zinc-500">
        <span className="text-red-700" aria-hidden="true">
          *
        </span>{' '}
        Pflichtangaben. Telefon oder E-Mail reicht als Kontakt.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
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

        <div>
          <label className={labelClassName} htmlFor={`${formId}-phone`}>
            Telefon
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
      </div>

      <p id={`${formId}-contact-hint`} className="text-xs text-zinc-500">
        Mindestens Telefon oder E-Mail. Internationale Nummern bitte mit führendem +
        angeben.
      </p>

      <div>
        <label className={labelClassName} htmlFor={`${formId}-preferredChannel`}>
          Bevorzugter Rückruf / Kontakt
        </label>
        <select
          id={`${formId}-preferredChannel`}
          name="preferredChannel"
          disabled={locked}
          className={fieldClassName}
          value={values.preferredChannel}
          onChange={(e) =>
            updateField('preferredChannel', e.target.value as KfzPreferredChannel)
          }
        >
          <option value="phone">Telefon</option>
          <option value="email">E-Mail</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>

      <div>
        <label className={labelClassName} htmlFor={`${formId}-inquiryReason`}>
          Ihr Anliegen
          <RequiredMark />
        </label>
        <textarea
          id={`${formId}-inquiryReason`}
          name="inquiryReason"
          required
          aria-required="true"
          rows={3}
          disabled={locked}
          className={fieldClassName}
          placeholder="z. B. Wechsel der Kfz-Versicherung, neues Fahrzeug, Schadenfreiheitsrabatt …"
          value={values.inquiryReason}
          onChange={(e) => updateField('inquiryReason', e.target.value)}
        />
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-1 text-sm font-medium text-zinc-800">
          Fahrzeug (optional)
        </legend>
        <div>
          <label className={labelClassName} htmlFor={`${formId}-vehicleMake`}>
            Marke
          </label>
          <input
            id={`${formId}-vehicleMake`}
            name="vehicleMake"
            disabled={locked}
            className={fieldClassName}
            value={values.vehicleMake}
            onChange={(e) => updateField('vehicleMake', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor={`${formId}-vehicleModel`}>
            Modell
          </label>
          <input
            id={`${formId}-vehicleModel`}
            name="vehicleModel"
            disabled={locked}
            className={fieldClassName}
            value={values.vehicleModel}
            onChange={(e) => updateField('vehicleModel', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor={`${formId}-vehicleYear`}>
            Baujahr
          </label>
          <input
            id={`${formId}-vehicleYear`}
            name="vehicleYear"
            inputMode="numeric"
            disabled={locked}
            className={fieldClassName}
            value={values.vehicleYear}
            onChange={(e) => updateField('vehicleYear', e.target.value)}
          />
        </div>
      </fieldset>

      <div>
        <label className={labelClassName} htmlFor={`${formId}-contextNotes`}>
          Weitere Hinweise (optional)
        </label>
        <textarea
          id={`${formId}-contextNotes`}
          name="contextNotes"
          rows={2}
          disabled={locked}
          className={fieldClassName}
          value={values.contextNotes}
          onChange={(e) => updateField('contextNotes', e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-3">
        <div className="flex items-start gap-3">
          <input
            id={`${formId}-consent`}
            name="inquiryProcessingConsent"
            type="checkbox"
            required
            aria-required="true"
            disabled={locked}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-zinc-400 text-blue-700 focus:ring-blue-600"
            checked={values.inquiryProcessingConsent}
            onChange={(e) => updateField('inquiryProcessingConsent', e.target.checked)}
          />
          <label htmlFor={`${formId}-consent`} className="min-h-11 text-sm leading-relaxed text-zinc-700">
            Ich willige ein, dass Allianz Kusnezov meine Angaben zur Bearbeitung dieser
            Kfz-Anfrage speichert und mich dazu kontaktiert. Es handelt sich nicht um
            eine Einwilligung für Werbung. Details:{' '}
            <a
              href="/datenschutz"
              className="font-medium text-blue-700 underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Datenschutz
            </a>
            . (Consent-Stand: {KFZ_LANDING_CONSENT_VERSION})
            <RequiredMark />
          </label>
        </div>
        <p id={`${formId}-privacy`} className="mt-2 text-xs text-zinc-500">
          Pflichtfelder sind Name, PLZ, Ort, Anliegen, Consent sowie Telefon oder E-Mail.
          Es werden keine Preisversprechen oder KI-Tarife angezeigt.
        </p>
      </div>

      {(clientError || serverError) && (
        <div ref={errorRef} tabIndex={-1} className="outline-none">
          <Alert variant="error">
            <p className="font-medium">Anfrage nicht gespeichert</p>
            <p className="mt-1 text-sm">{clientError ?? serverError}</p>
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
          </Alert>
        </div>
      )}

      <Button
        type="submit"
        variant="primary-lg"
        disabled={locked}
        aria-busy={phase === 'submitting' || isPending}
        className="min-h-12 w-full sm:w-auto"
      >
        {phase === 'submitting' || isPending
          ? 'Wird gesendet …'
          : 'Unverbindliche Anfrage senden'}
      </Button>
    </form>
  )
}
