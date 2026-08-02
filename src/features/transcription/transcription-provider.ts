import type {
  TranscriptionAudioInput,
  TranscriptionProviderResult,
} from '@/features/transcription/transcription-types'

/**
 * Provider-unabhängige STT-Grenze.
 * Deepgram, OpenAI oder Azure können hinter dieser Schnittstelle ausgetauscht werden.
 */
export interface TranscriptionProvider {
  readonly id: string
  readonly model: string
  transcribe(input: TranscriptionAudioInput): Promise<TranscriptionProviderResult>
}
