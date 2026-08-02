import type { TranscriptionProvider } from '@/features/transcription/transcription-provider'
import {
  TranscriptionProviderError,
  type TranscriptionAudioInput,
  type TranscriptionProviderResult,
} from '@/features/transcription/transcription-types'

const DEFAULT_DEEPGRAM_API_BASE_URL = 'https://api.deepgram.com'
const DEEPGRAM_PROVIDER_ID = 'deepgram'
const DEEPGRAM_MODEL = 'nova-3'
const DEEPGRAM_REQUEST_TIMEOUT_MS = 90_000

type DeepgramWord = {
  confidence?: number
}

type DeepgramAlternative = {
  transcript?: string
  confidence?: number
  words?: DeepgramWord[]
}

type DeepgramChannel = {
  alternatives?: DeepgramAlternative[]
}

type DeepgramResult = {
  channels?: DeepgramChannel[]
}

type DeepgramMetadata = {
  duration?: number
}

type DeepgramListenResponse = {
  metadata?: DeepgramMetadata
  results?: DeepgramResult
}

function getDeepgramApiKey(): string {
  const apiKey = process.env.DEEPGRAM_API_KEY?.trim()

  if (!apiKey) {
    throw new TranscriptionProviderError(
      'Spracherkennung ist nicht konfiguriert (DEEPGRAM_API_KEY fehlt).',
      'not_configured',
    )
  }

  return apiKey
}

function getDeepgramApiBaseUrl(): string {
  const configured = process.env.DEEPGRAM_API_BASE_URL?.trim()
  if (!configured) {
    return DEFAULT_DEEPGRAM_API_BASE_URL
  }

  return configured.replace(/\/+$/, '')
}

function buildListenUrl(keyTerms: string[] | undefined): string {
  const params = new URLSearchParams({
    model: DEEPGRAM_MODEL,
    language: 'multi',
    smart_format: 'true',
    punctuate: 'true',
  })

  for (const term of keyTerms ?? []) {
    const normalized = term.trim()
    if (normalized) {
      params.append('keyterm', normalized)
    }
  }

  return `${getDeepgramApiBaseUrl()}/v1/listen?${params.toString()}`
}

function averageWordConfidence(words: DeepgramWord[] | undefined): number | null {
  if (!words || words.length === 0) {
    return null
  }

  const values = words
    .map((word) => word.confidence)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  if (values.length === 0) {
    return null
  }

  const sum = values.reduce((total, value) => total + value, 0)
  return sum / values.length
}

function parseDeepgramResponse(payload: unknown): TranscriptionProviderResult {
  if (!payload || typeof payload !== 'object') {
    throw new TranscriptionProviderError(
      'Ungültige Antwort der Spracherkennung.',
      'invalid_response',
    )
  }

  const response = payload as DeepgramListenResponse
  const alternative = response.results?.channels?.[0]?.alternatives?.[0]
  const text = alternative?.transcript?.trim() ?? ''

  if (!text) {
    throw new TranscriptionProviderError(
      'Die Spracherkennung hat kein Transkript geliefert.',
      'empty_transcript',
    )
  }

  const confidence =
    typeof alternative?.confidence === 'number' && Number.isFinite(alternative.confidence)
      ? alternative.confidence
      : averageWordConfidence(alternative?.words)

  const durationSeconds =
    typeof response.metadata?.duration === 'number' && Number.isFinite(response.metadata.duration)
      ? response.metadata.duration
      : null

  return {
    text,
    // Nova-3 multilingual may mix languages; no single language field is guaranteed.
    detectedLanguage: 'multi',
    durationSeconds,
    confidence,
    provider: DEEPGRAM_PROVIDER_ID,
    model: DEEPGRAM_MODEL,
  }
}

function mapHttpError(status: number, bodyText: string): TranscriptionProviderError {
  const detail = bodyText.trim().slice(0, 240)
  const suffix = detail ? ` (${detail})` : ''

  if (status >= 500) {
    return new TranscriptionProviderError(
      `Spracherkennung vorübergehend nicht erreichbar.${suffix}`,
      'provider_5xx',
      status,
    )
  }

  if (status === 401 || status === 403) {
    return new TranscriptionProviderError(
      `Spracherkennung abgelehnt (Zugriff/API-Key).${suffix}`,
      'provider_4xx',
      status,
    )
  }

  if (status === 413) {
    return new TranscriptionProviderError(
      `Audiodatei ist für die Spracherkennung zu groß.${suffix}`,
      'provider_4xx',
      status,
    )
  }

  return new TranscriptionProviderError(
    `Spracherkennung abgelehnt (${status}).${suffix}`,
    'provider_4xx',
    status,
  )
}

/**
 * Deepgram Nova-3 Multilingual via REST (kein SDK).
 * Kandidatensprachen Deutsch/Russisch werden über language=multi abgedeckt;
 * Mischsprachen werden nicht als perfekt erkannt behauptet.
 */
export class DeepgramTranscriptionProvider implements TranscriptionProvider {
  readonly id = DEEPGRAM_PROVIDER_ID
  readonly model = DEEPGRAM_MODEL

  async transcribe(input: TranscriptionAudioInput): Promise<TranscriptionProviderResult> {
    const apiKey = getDeepgramApiKey()
    const url = buildListenUrl(input.keyTerms)
    const contentType = input.mimeType.split(';')[0]?.trim() || 'application/octet-stream'

    let response: Response

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': contentType,
        },
        body: input.bytes,
        signal: AbortSignal.timeout(DEEPGRAM_REQUEST_TIMEOUT_MS),
        cache: 'no-store',
      })
    } catch (error) {
      if (error instanceof TranscriptionProviderError) {
        throw error
      }

      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new TranscriptionProviderError(
          'Spracherkennung hat zu lange gedauert (Timeout).',
          'timeout',
        )
      }

      throw new TranscriptionProviderError(
        'Spracherkennung konnte nicht erreicht werden.',
        'unknown',
      )
    }

    const bodyText = await response.text()

    if (!response.ok) {
      throw mapHttpError(response.status, bodyText)
    }

    let payload: unknown

    try {
      payload = JSON.parse(bodyText) as unknown
    } catch {
      throw new TranscriptionProviderError(
        'Ungültige Antwort der Spracherkennung.',
        'invalid_response',
      )
    }

    return parseDeepgramResponse(payload)
  }
}

export function createDeepgramTranscriptionProvider(): TranscriptionProvider {
  return new DeepgramTranscriptionProvider()
}
