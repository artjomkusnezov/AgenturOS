'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { CaptureDialogShell } from '@/features/capture/components/capture-dialog-shell'
import { createCaptureInboxAction } from '@/features/capture/actions/create-capture-inbox'
import { deleteCaptureInboxAction } from '@/features/capture/actions/delete-capture-inbox'
import { linkCaptureFileAction } from '@/features/capture/actions/link-capture-file'
import { uploadCaptureFileAction } from '@/features/capture/actions/upload-capture-file'
import { getCaptureFileValidationMessage } from '@/features/capture/lib/validate-capture-file'
import {
  buildVoiceRecordingFilename,
  formatVoiceDuration,
  getVoiceEnvironmentErrorMessage,
  getVoiceEnvironmentIssue,
  selectVoiceRecorderMimeType,
  startSilenceMonitor,
  startVoiceRecording,
  stopMediaStream,
  VOICE_MAX_DURATION_MS,
  VOICE_MIN_DURATION_MS,
  VOICE_PLACEHOLDER_CONTENT,
  type ActiveVoiceRecording,
  type SilenceMonitor,
} from '@/features/capture/lib/voice-recording'
import {
  aosAlertWarningClassName,
  aosBtnGhostLgClassName,
  aosBtnPrimaryLgClassName,
  aosBtnSecondaryLgClassName,
  aosFieldErrorSmClassName,
  aosTextMetaClassName,
} from '@/lib/design-system'

type VoiceCaptureDialogProps = {
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

type VoicePhase = 'idle' | 'recording' | 'review' | 'saving'

function releaseObjectUrl(url: string | null): void {
  if (url) {
    URL.revokeObjectURL(url)
  }
}

export function VoiceCaptureDialog({ onClose, triggerRef }: VoiceCaptureDialogProps) {
  const router = useRouter()
  const recordingRef = useRef<ActiveVoiceRecording | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const silenceMonitorRef = useRef<SilenceMonitor | null>(null)
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)
  const objectUrlRef = useRef<string | null>(null)
  const processingRef = useRef(false)
  const stoppingRef = useRef(false)
  const inboxItemIdRef = useRef<string | null>(null)

  const [phase, setPhase] = useState<VoicePhase>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioFilename, setAudioFilename] = useState<string | null>(null)
  const [inboxItemId, setInboxItemId] = useState<string | null>(null)
  const [silenceArmed, setSilenceArmed] = useState(false)

  const envIssue = getVoiceEnvironmentIssue()
  const supportError = envIssue ? getVoiceEnvironmentErrorMessage(envIssue) : null

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const clearSilenceMonitor = useCallback(() => {
    silenceMonitorRef.current?.stop()
    silenceMonitorRef.current = null
    setSilenceArmed(false)
  }, [])

  const clearRecordingResources = useCallback(() => {
    clearTimer()
    silenceMonitorRef.current?.stop()
    silenceMonitorRef.current = null
    recordingRef.current = null
    stopMediaStream(streamRef.current)
    streamRef.current = null
  }, [clearTimer])

  const clearPreview = useCallback(() => {
    releaseObjectUrl(objectUrlRef.current)
    objectUrlRef.current = null
    setPreviewUrl(null)
    setAudioBlob(null)
    setAudioFilename(null)
  }, [])

  useEffect(() => {
    return () => {
      clearRecordingResources()
      releaseObjectUrl(objectUrlRef.current)
      objectUrlRef.current = null
      const orphanId = inboxItemIdRef.current
      if (orphanId) {
        void deleteCaptureInboxAction(orphanId)
      }
    }
  }, [clearRecordingResources])

  useEffect(() => {
    inboxItemIdRef.current = inboxItemId
  }, [inboxItemId])

  const finishRecording = useCallback(
    async (reason: 'manual' | 'silence' | 'max_duration') => {
      if (stoppingRef.current || !recordingRef.current) {
        return
      }

      stoppingRef.current = true
      clearTimer()
      clearSilenceMonitor()

      try {
        const blob = await recordingRef.current.stop()
        stopMediaStream(streamRef.current)
        streamRef.current = null
        recordingRef.current = null

        const duration = performance.now() - startedAtRef.current
        setElapsedMs(duration)

        if (blob.size <= 0 || duration < VOICE_MIN_DURATION_MS) {
          setError(
            reason === 'silence'
              ? 'Die Aufnahme war zu kurz. Bitte erneut sprechen.'
              : 'Die Aufnahme ist zu kurz. Bitte erneut aufnehmen.',
          )
          setPhase('idle')
          stoppingRef.current = false
          return
        }

        const mimeSelection = selectVoiceRecorderMimeType()
        const extension = mimeSelection.extension
        const filename = buildVoiceRecordingFilename(extension)
        const typedBlob =
          blob.type && blob.type.length > 0
            ? blob
            : new Blob([blob], {
                type: mimeSelection.mimeType?.split(';')[0] ?? 'audio/webm',
              })

        releaseObjectUrl(objectUrlRef.current)
        const url = URL.createObjectURL(typedBlob)
        objectUrlRef.current = url
        setPreviewUrl(url)
        setAudioBlob(typedBlob)
        setAudioFilename(filename)
        setError(null)
        setPhase('review')
      } catch (stopError) {
        if (stopError instanceof Error && stopError.message === 'cancelled') {
          setPhase('idle')
        } else {
          setError('Die Aufnahme konnte nicht beendet werden.')
          setPhase('idle')
        }
      } finally {
        stoppingRef.current = false
      }
    },
    [clearSilenceMonitor, clearTimer],
  )

  const handleStart = useCallback(async () => {
    if (phase === 'recording' || phase === 'saving' || supportError) {
      return
    }

    setError(null)
    clearPreview()

    try {
      const { recording, stream, mimeSelection } = await startVoiceRecording({
        onError: (message) => setError(message),
      })

      recordingRef.current = recording
      streamRef.current = stream
      startedAtRef.current = performance.now()
      setElapsedMs(0)
      setPhase('recording')
      void mimeSelection

      clearTimer()
      timerRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startedAtRef.current
        setElapsedMs(elapsed)
        if (elapsed >= VOICE_MAX_DURATION_MS) {
          void finishRecording('max_duration')
        }
      }, 200)

      const monitor = startSilenceMonitor(stream, {
        onSilence: () => {
          void finishRecording('silence')
        },
      })
      silenceMonitorRef.current = monitor
      setSilenceArmed(monitor !== null)
    } catch (startError) {
      clearRecordingResources()
      setPhase('idle')
      setError(
        startError instanceof Error
          ? startError.message
          : 'Mikrofon konnte nicht gestartet werden.',
      )
    }
  }, [
    clearPreview,
    clearRecordingResources,
    clearTimer,
    finishRecording,
    phase,
    supportError,
  ])

  const handleDiscard = useCallback(() => {
    if (phase === 'saving') {
      return
    }

    if (phase === 'recording') {
      recordingRef.current?.cancel()
      clearRecordingResources()
      setPhase('idle')
      setElapsedMs(0)
      setError(null)
      return
    }

    clearPreview()
    setPhase('idle')
    setElapsedMs(0)
    setError(null)
  }, [clearPreview, clearRecordingResources, phase])

  const handleClose = useCallback(() => {
    if (phase === 'saving') {
      return
    }

    if (phase === 'recording') {
      recordingRef.current?.cancel()
    }

    clearRecordingResources()
    clearPreview()

    const partialInboxId = inboxItemId
    inboxItemIdRef.current = null
    setInboxItemId(null)
    onClose()

    if (partialInboxId) {
      void deleteCaptureInboxAction(partialInboxId)
    }
  }, [clearPreview, clearRecordingResources, inboxItemId, onClose, phase])

  const handleSave = useCallback(async () => {
    if (processingRef.current || phase === 'saving') {
      return
    }

    if (!audioBlob || !audioFilename) {
      setError('Keine Aufnahme zum Speichern vorhanden.')
      return
    }

    const file = new File([audioBlob], audioFilename, {
      type: audioBlob.type || 'audio/webm',
      lastModified: Date.now(),
    })

    const validationMessage = getCaptureFileValidationMessage(file)
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    processingRef.current = true
    setPhase('saving')
    setError(null)

    try {
      let targetInboxId = inboxItemId

      if (!targetInboxId) {
        const createResult = await createCaptureInboxAction(VOICE_PLACEHOLDER_CONTENT, [
          audioFilename,
        ])

        if ('error' in createResult) {
          setError(createResult.error)
          setPhase('review')
          return
        }

        targetInboxId = createResult.itemId
        setInboxItemId(targetInboxId)
        inboxItemIdRef.current = targetInboxId
      }

      const formData = new FormData()
      formData.set('file', file)
      const uploadResult = await uploadCaptureFileAction(formData)

      if ('error' in uploadResult) {
        setError(uploadResult.error)
        setPhase('review')
        return
      }

      if ('fieldErrors' in uploadResult) {
        setError(uploadResult.fieldErrors.file)
        setPhase('review')
        return
      }

      const linkResult = await linkCaptureFileAction(targetInboxId, uploadResult.fileId)

      if ('error' in linkResult) {
        setError(linkResult.error)
        setPhase('review')
        return
      }

      const destination = `/app/inbox?item=${encodeURIComponent(targetInboxId)}`
      // Prevent unmount cleanup from deleting the saved inbox.
      inboxItemIdRef.current = null
      setInboxItemId(null)
      clearRecordingResources()
      clearPreview()
      onClose()
      router.push(destination)
      router.refresh()
    } catch {
      setError('Speichern fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen.')
      setPhase('review')
    } finally {
      processingRef.current = false
    }
  }, [
    audioBlob,
    audioFilename,
    clearPreview,
    clearRecordingResources,
    inboxItemId,
    onClose,
    phase,
    router,
  ])

  const handleRetrySave = useCallback(() => {
    void handleSave()
  }, [handleSave])

  const handleAbandonPartialInbox = useCallback(async () => {
    if (!inboxItemId || phase === 'saving') {
      return
    }

    await deleteCaptureInboxAction(inboxItemId)
    inboxItemIdRef.current = null
    setInboxItemId(null)
    handleDiscard()
  }, [handleDiscard, inboxItemId, phase])

  const isBusy = phase === 'saving'
  const statusLabel =
    phase === 'recording'
      ? silenceArmed
        ? 'Aufnahme läuft · stoppt bei längerer Stille'
        : 'Aufnahme läuft'
      : phase === 'review'
        ? 'Aufnahme bereit'
        : phase === 'saving'
          ? 'Wird gespeichert…'
          : 'Bereit'

  return (
    <CaptureDialogShell
      isOpen
      title="Sprachnotiz"
      description="Sprechen, stoppen, prüfen und als Eingang speichern."
      onClose={handleClose}
      closeDisabled={isBusy}
      triggerRef={triggerRef}
      footer={
        <div
          className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
          style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
        >
          {phase === 'review' ? (
            <>
              <button
                type="button"
                className={`${aosBtnGhostLgClassName} min-h-11`}
                onClick={inboxItemId ? () => void handleAbandonPartialInbox() : handleDiscard}
                disabled={isBusy}
              >
                Verwerfen
              </button>
              <button
                type="button"
                className={`${aosBtnSecondaryLgClassName} min-h-11`}
                onClick={() => {
                  const reRecord = async () => {
                    if (inboxItemId) {
                      await deleteCaptureInboxAction(inboxItemId)
                      setInboxItemId(null)
                    }
                    clearPreview()
                    setPhase('idle')
                    setElapsedMs(0)
                    setError(null)
                  }
                  void reRecord()
                }}
                disabled={isBusy}
              >
                Neu aufnehmen
              </button>
              <button
                type="button"
                className={`${aosBtnPrimaryLgClassName} min-h-11`}
                onClick={() => void (inboxItemId ? handleRetrySave() : handleSave())}
                disabled={isBusy}
              >
                {isBusy ? 'Speichern…' : inboxItemId ? 'Erneut speichern' : 'Speichern'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`${aosBtnGhostLgClassName} min-h-11`}
              onClick={handleClose}
              disabled={isBusy}
            >
              Schließen
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5 px-5 py-5">
        {supportError ? (
          <p className={aosAlertWarningClassName} role="alert">
            {supportError}
          </p>
        ) : null}

        {error ? (
          <p className={aosFieldErrorSmClassName} role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col items-center gap-4 py-2">
          <p className={`text-center ${aosTextMetaClassName}`}>{statusLabel}</p>
          <p className="font-mono text-3xl tabular-nums text-zinc-900" aria-live="polite">
            {formatVoiceDuration(elapsedMs)}
          </p>

          {phase === 'recording' ? (
            <button
              type="button"
              onClick={() => void finishRecording('manual')}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-red-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              Stop
            </button>
          ) : phase === 'idle' || phase === 'saving' ? (
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={Boolean(supportError) || isBusy}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aufnehmen
            </button>
          ) : null}
        </div>

        {phase === 'review' && previewUrl ? (
          <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className={`text-xs font-semibold uppercase tracking-wider text-zinc-500`}>
              Vorschau
            </p>
            <audio controls src={previewUrl} className="w-full" preload="metadata">
              Audio-Vorschau wird von diesem Browser nicht unterstützt.
            </audio>
            {audioFilename ? (
              <p className={`truncate ${aosTextMetaClassName}`}>{audioFilename}</p>
            ) : null}
          </div>
        ) : null}

        {phase === 'idle' && !supportError ? (
          <p className={`text-center ${aosTextMetaClassName}`}>
            Ein Knopf · sprechen · stoppen · speichern. Keine Formulare.
          </p>
        ) : null}
      </div>
    </CaptureDialogShell>
  )
}
