'use client'

import { useActionState, useEffect, useRef } from 'react'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconFileText } from '@/features/dashboard/components/dashboard-icons'
import type { InboxItem, InboxLinkedFile } from '@/features/inbox/types/inbox-item'
import { hasVoiceAudioAttachment } from '@/features/transcription/lib/transcription-audio'
import { transcribeInboxItemAction } from '@/features/transcription/transcription-actions'
import type {
  TranscriptionMutationState,
  TranscriptionStatus,
} from '@/features/transcription/transcription-types'
import {
  aosBtnSecondaryClassName,
  aosFieldErrorSmClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

type InboxTranscriptionSectionProps = {
  item: InboxItem
  attachments: InboxLinkedFile[]
  onStatusChange: () => void
}

const initialState: TranscriptionMutationState = {}

function asTranscriptionStatus(value: string): TranscriptionStatus {
  switch (value) {
    case 'pending':
    case 'processing':
    case 'completed':
    case 'failed':
    case 'none':
      return value
    default:
      return 'none'
  }
}

export function InboxTranscriptionSection({
  item,
  attachments,
  onStatusChange,
}: InboxTranscriptionSectionProps) {
  const status = asTranscriptionStatus(item.transcription_status)
  const isVoiceItem = hasVoiceAudioAttachment(attachments) || status !== 'none'

  const [state, formAction, isPending] = useActionState(transcribeInboxItemAction, initialState)
  const wasPendingRef = useRef(false)
  const handledSuccessRef = useRef(false)

  useEffect(() => {
    handledSuccessRef.current = false
  }, [item.id])

  useEffect(() => {
    if (
      wasPendingRef.current &&
      !isPending &&
      (state.success || state.error) &&
      !handledSuccessRef.current
    ) {
      handledSuccessRef.current = true
      onStatusChange()
    }

    wasPendingRef.current = isPending
  }, [isPending, state.success, state.error, onStatusChange])

  if (!isVoiceItem) {
    return null
  }

  const showWaiting = status === 'pending' && !isPending
  const showRunning = status === 'processing' || isPending
  const showCompleted = status === 'completed' && !isPending
  const showFailed = status === 'failed' && !isPending
  const showStart = status === 'none' && hasVoiceAudioAttachment(attachments) && !isPending

  return (
    <section aria-label="Transkript" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Transkript"
        accent="blue"
        icon={<DashboardIconFileText className="h-4 w-4" />}
      />

      {showWaiting ? (
        <p className={aosWorkspaceMetaClassName}>Transkription wartet …</p>
      ) : null}

      {showRunning ? (
        <p className={aosWorkspaceMetaClassName}>Transkription läuft …</p>
      ) : null}

      {showCompleted && item.transcript_text ? (
        <div className="space-y-2">
          <p className={`whitespace-pre-wrap text-sm leading-relaxed ${aosWsTextPrimaryClassName}`}>
            {item.transcript_text}
          </p>
          {item.detected_language ? (
            <p className={aosWorkspaceMetaClassName}>
              Erkannte Sprache: {item.detected_language}
              {item.transcription_provider ? ` · ${item.transcription_provider}` : ''}
              {item.transcription_model ? ` / ${item.transcription_model}` : ''}
            </p>
          ) : null}
        </div>
      ) : null}

      {showCompleted && !item.transcript_text ? (
        <p className={aosWorkspaceMetaClassName}>Transkript ist leer.</p>
      ) : null}

      {showFailed ? (
        <div className="space-y-3">
          <p className={aosFieldErrorSmClassName}>
            {item.transcription_error ?? 'Die Spracherkennung ist fehlgeschlagen.'}
          </p>
          <form action={formAction}>
            <input type="hidden" name="itemId" value={item.id} />
            <button type="submit" disabled={isPending} className={aosBtnSecondaryClassName}>
              Erneut transkribieren
            </button>
          </form>
        </div>
      ) : null}

      {showStart ? (
        <div className="space-y-3">
          <p className={aosWorkspaceMetaClassName}>Noch keine Transkription.</p>
          <form action={formAction}>
            <input type="hidden" name="itemId" value={item.id} />
            <button type="submit" disabled={isPending} className={aosBtnSecondaryClassName}>
              Transkribieren
            </button>
          </form>
        </div>
      ) : null}

      {state.error && !showFailed ? (
        <p className={`mt-2 ${aosFieldErrorSmClassName}`}>{state.error}</p>
      ) : null}
    </section>
  )
}
