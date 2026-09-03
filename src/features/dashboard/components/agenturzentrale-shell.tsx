import type { ReactNode } from 'react'

import {
  AGENTURZENTRALE_SHELL_ATMOSPHERE_CLASS,
  AGENTURZENTRALE_SHELL_CHROME_CLASS,
  AGENTURZENTRALE_SHELL_CLASS,
  AGENTURZENTRALE_SHELL_CONTENT_CLASS,
  AGENTURZENTRALE_SHELL_EYEBROW_CLASS,
  AGENTURZENTRALE_SHELL_FRAME_CLASS,
  AGENTURZENTRALE_SHELL_LABEL,
} from '@/features/dashboard/lib/agenturzentrale-shell'

type AgenturzentraleShellProps = {
  children: ReactNode
}

/**
 * First Agenturzentrale visual shell for `/app` only.
 * Server Component — framing and atmosphere, no data or client state.
 */
export function AgenturzentraleShell({ children }: AgenturzentraleShellProps) {
  return (
    <div
      className={AGENTURZENTRALE_SHELL_CLASS}
      data-agenturzentrale-shell=""
      aria-label={AGENTURZENTRALE_SHELL_LABEL}
    >
      <div className={AGENTURZENTRALE_SHELL_ATMOSPHERE_CLASS} aria-hidden="true" />
      <div className={AGENTURZENTRALE_SHELL_FRAME_CLASS}>
        <div className={AGENTURZENTRALE_SHELL_CHROME_CLASS}>
          <p className={AGENTURZENTRALE_SHELL_EYEBROW_CLASS}>{AGENTURZENTRALE_SHELL_LABEL}</p>
        </div>
        <div className={AGENTURZENTRALE_SHELL_CONTENT_CLASS}>{children}</div>
      </div>
    </div>
  )
}
