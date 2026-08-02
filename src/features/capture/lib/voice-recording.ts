/**
 * Voice recording helpers for Punkt 33B.1.
 * Audio is the source of truth — no SpeechRecognition / STT here.
 */

export const VOICE_PLACEHOLDER_CONTENT = 'Sprachnachricht'

/** Minimum usable recording length before save. */
export const VOICE_MIN_DURATION_MS = 1000

/** Hard cap — auto-stop to avoid runaway recordings / oversized uploads. */
export const VOICE_MAX_DURATION_MS = 10 * 60 * 1000

/**
 * Silence auto-stop: require this many consecutive quiet frames.
 * Conservative — prefer manual stop over false saves.
 */
export const VOICE_SILENCE_DURATION_MS = 6000

/** RMS threshold (0–1 scale from Analyser byte time domain). */
export const VOICE_SILENCE_RMS_THRESHOLD = 0.02

const PREFERRED_RECORDER_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/ogg;codecs=opus',
  'audio/ogg',
] as const

export type VoiceRecorderMimeSelection = {
  mimeType: string | undefined
  extension: string
}

export type VoiceEnvironmentIssue =
  | 'insecure_context'
  | 'unsupported_media_devices'
  | 'unsupported_media_recorder'

export function getVoiceEnvironmentIssue(): VoiceEnvironmentIssue | null {
  if (typeof window === 'undefined') {
    return 'unsupported_media_devices'
  }

  if (!window.isSecureContext) {
    return 'insecure_context'
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return 'unsupported_media_devices'
  }

  if (typeof MediaRecorder === 'undefined') {
    return 'unsupported_media_recorder'
  }

  return null
}

export function getVoiceEnvironmentErrorMessage(issue: VoiceEnvironmentIssue): string {
  switch (issue) {
    case 'insecure_context':
      return 'Sprachnotizen benötigen eine sichere Verbindung (HTTPS oder localhost).'
    case 'unsupported_media_devices':
      return 'Dieses Gerät oder dieser Browser stellt kein Mikrofon bereit.'
    case 'unsupported_media_recorder':
      return 'Audioaufnahme wird von diesem Browser nicht unterstützt.'
  }
}

function extensionForMimeType(mimeType: string | undefined): string {
  if (!mimeType) {
    return 'webm'
  }

  const base = mimeType.split(';')[0]?.trim().toLowerCase() ?? ''

  if (base === 'audio/mp4' || base === 'audio/aac' || base === 'audio/x-m4a') {
    return 'm4a'
  }

  if (base === 'audio/mpeg') {
    return 'mp3'
  }

  if (base === 'audio/ogg' || base === 'audio/opus') {
    return 'ogg'
  }

  if (base === 'audio/wav' || base === 'audio/wave' || base === 'audio/x-wav') {
    return 'wav'
  }

  if (base === 'audio/webm') {
    return 'webm'
  }

  return 'webm'
}

export function selectVoiceRecorderMimeType(): VoiceRecorderMimeSelection {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: undefined, extension: 'webm' }
  }

  for (const candidate of PREFERRED_RECORDER_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return {
        mimeType: candidate,
        extension: extensionForMimeType(candidate),
      }
    }
  }

  return { mimeType: undefined, extension: 'webm' }
}

export function buildVoiceRecordingFilename(extension: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `Sprachnachricht-${stamp}.${extension}`
}

export function formatVoiceDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) {
    return
  }

  for (const track of stream.getTracks()) {
    track.stop()
  }
}

export type SilenceMonitor = {
  stop: () => void
}

/**
 * Optional silence monitor. Returns null when AudioContext/Analyser is unavailable.
 * Does not touch the MediaRecorder — only observes the same MediaStream.
 */
export function startSilenceMonitor(
  stream: MediaStream,
  options: {
    silenceDurationMs?: number
    rmsThreshold?: number
    onSilence: () => void
  },
): SilenceMonitor | null {
  const silenceDurationMs = options.silenceDurationMs ?? VOICE_SILENCE_DURATION_MS
  const rmsThreshold = options.rmsThreshold ?? VOICE_SILENCE_RMS_THRESHOLD

  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextCtor) {
    return null
  }

  let audioContext: AudioContext
  try {
    audioContext = new AudioContextCtor()
  } catch {
    return null
  }

  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 2048
  const source = audioContext.createMediaStreamSource(stream)
  source.connect(analyser)

  const data = new Uint8Array(analyser.fftSize)
  let quietSince: number | null = null
  let rafId = 0
  let stopped = false
  let fired = false

  const tick = () => {
    if (stopped || fired) {
      return
    }

    analyser.getByteTimeDomainData(data)

    let sumSquares = 0
    for (let i = 0; i < data.length; i += 1) {
      const centered = (data[i] - 128) / 128
      sumSquares += centered * centered
    }
    const rms = Math.sqrt(sumSquares / data.length)
    const now = performance.now()

    if (rms < rmsThreshold) {
      if (quietSince === null) {
        quietSince = now
      } else if (now - quietSince >= silenceDurationMs) {
        fired = true
        options.onSilence()
        return
      }
    } else {
      quietSince = null
    }

    rafId = window.requestAnimationFrame(tick)
  }

  void audioContext.resume().catch(() => {
    /* ignore — monitor simply won't fire */
  })
  rafId = window.requestAnimationFrame(tick)

  return {
    stop: () => {
      stopped = true
      window.cancelAnimationFrame(rafId)
      try {
        source.disconnect()
      } catch {
        /* ignore */
      }
      try {
        analyser.disconnect()
      } catch {
        /* ignore */
      }
      void audioContext.close().catch(() => {
        /* ignore */
      })
    },
  }
}

export type ActiveVoiceRecording = {
  stop: () => Promise<Blob>
  cancel: () => void
}

/**
 * Starts mic capture + MediaRecorder. Blob is produced only after a clean stop().
 * cancel() discards chunks and releases the stream.
 */
export async function startVoiceRecording(options?: {
  onError?: (message: string) => void
}): Promise<{
  recording: ActiveVoiceRecording
  stream: MediaStream
  mimeSelection: VoiceRecorderMimeSelection
}> {
  const envIssue = getVoiceEnvironmentIssue()
  if (envIssue) {
    throw new Error(getVoiceEnvironmentErrorMessage(envIssue))
  }

  const mimeSelection = selectVoiceRecorderMimeType()
  let stream: MediaStream

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    })
  } catch (error) {
    const name = error instanceof DOMException ? error.name : ''
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      throw new Error('Mikrofonzugriff wurde verweigert.')
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      throw new Error('Kein Mikrofon gefunden.')
    }
    throw new Error('Mikrofon konnte nicht gestartet werden.')
  }

  const chunks: BlobPart[] = []
  const recorder = mimeSelection.mimeType
    ? new MediaRecorder(stream, { mimeType: mimeSelection.mimeType })
    : new MediaRecorder(stream)

  let settlePromise: Promise<Blob> | null = null
  let settleResolve: ((blob: Blob) => void) | null = null
  let settleReject: ((error: Error) => void) | null = null
  let cancelled = false

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  recorder.onerror = () => {
    options?.onError?.('Aufnahmefehler.')
    settleReject?.(new Error('Aufnahmefehler.'))
  }

  recorder.onstop = () => {
    if (cancelled) {
      chunks.length = 0
      settleReject?.(new Error('cancelled'))
      return
    }

    const type = recorder.mimeType || mimeSelection.mimeType || 'audio/webm'
    const blob = new Blob(chunks, { type })
    chunks.length = 0
    settleResolve?.(blob)
  }

  const ensureSettlePromise = () => {
    if (!settlePromise) {
      settlePromise = new Promise<Blob>((resolve, reject) => {
        settleResolve = resolve
        settleReject = reject
      })
    }
    return settlePromise
  }

  recorder.start(250)

  const recording: ActiveVoiceRecording = {
    stop: async () => {
      if (recorder.state === 'inactive') {
        return ensureSettlePromise()
      }

      const promise = ensureSettlePromise()
      recorder.stop()
      return promise
    },
    cancel: () => {
      cancelled = true
      chunks.length = 0
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch {
          /* ignore */
        }
      }
      stopMediaStream(stream)
    },
  }

  return { recording, stream, mimeSelection }
}
