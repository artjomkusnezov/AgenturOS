export const TRANSCRIPTION_STATUSES = [
  'none',
  'pending',
  'processing',
  'completed',
  'failed',
] as const

export type TranscriptionStatus = (typeof TRANSCRIPTION_STATUSES)[number]

export type TranscriptionCandidateLanguage = 'de' | 'ru'

export type TranscriptionAudioInput = {
  bytes: ArrayBuffer
  mimeType: string
  filename: string
  candidateLanguages: TranscriptionCandidateLanguage[]
  keyTerms?: string[]
}

export type TranscriptionProviderResult = {
  text: string
  detectedLanguage: string | null
  durationSeconds: number | null
  confidence: number | null
  provider: string
  model: string
  providerMetadata?: Record<string, unknown>
}

export type TranscriptionProviderErrorCode =
  | 'not_configured'
  | 'timeout'
  | 'provider_4xx'
  | 'provider_5xx'
  | 'invalid_response'
  | 'empty_transcript'
  | 'unsupported_audio'
  | 'unknown'

export class TranscriptionProviderError extends Error {
  readonly code: TranscriptionProviderErrorCode
  readonly statusCode: number | null

  constructor(
    message: string,
    code: TranscriptionProviderErrorCode,
    statusCode: number | null = null,
  ) {
    super(message)
    this.name = 'TranscriptionProviderError'
    this.code = code
    this.statusCode = statusCode
  }
}

export type TranscriptionMutationState = {
  error?: string
  success?: boolean
  status?: TranscriptionStatus
}

export type TranscriptionJobResult =
  | {
      success: true
      status: TranscriptionStatus
      transcriptText: string | null
    }
  | {
      success: false
      error: string
      status: TranscriptionStatus
    }
