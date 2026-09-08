export type KfzLandingSubmitState =
  | { ok: true; deduplicated: boolean }
  | {
      ok: false
      error: string
      code?: string
      retryable: boolean
    }
