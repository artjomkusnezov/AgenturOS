/**
 * Client-seitige Submit-Phasen für die Kfz-Landingpage.
 * Verhindert Doppelklicks; Success darf nicht bei Fehler behauptet werden.
 */

export type KfzLandingSubmitPhase = 'idle' | 'submitting' | 'success' | 'error'

export function canStartKfzLandingSubmit(phase: KfzLandingSubmitPhase): boolean {
  return phase === 'idle' || phase === 'error'
}

/**
 * Transition in `submitting`, oder `null` wenn bereits gesperrt
 * (in-flight / success).
 */
export function beginKfzLandingSubmit(
  phase: KfzLandingSubmitPhase,
): KfzLandingSubmitPhase | null {
  if (!canStartKfzLandingSubmit(phase)) {
    return null
  }
  return 'submitting'
}

export function resolveKfzLandingSubmitResult(
  phase: KfzLandingSubmitPhase,
  outcome: 'success' | 'error',
): KfzLandingSubmitPhase {
  if (phase !== 'submitting') {
    return phase
  }
  return outcome
}

export function isKfzLandingSubmitLocked(phase: KfzLandingSubmitPhase): boolean {
  return phase === 'submitting' || phase === 'success'
}

/**
 * Stabile Submission-ID für Idempotenz (Gate-2 Replay-Schutz).
 * Bevorzugt `crypto.randomUUID`, Fallback ohne PII.
 */
export function createKfzLandingSubmissionId(
  randomUuid: () => string = () => crypto.randomUUID(),
): string {
  try {
    return randomUuid()
  } catch {
    return `kfz-lp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
}
