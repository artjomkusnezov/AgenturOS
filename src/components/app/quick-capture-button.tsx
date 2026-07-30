'use client'

import { PlusIcon } from '@/components/app/app-icons'

type QuickCaptureButtonProps = {
  variant?: 'floating' | 'sidebar'
  onClick: (trigger: HTMLButtonElement) => void
  className?: string
  disabled?: boolean
}

export function QuickCaptureButton({
  variant = 'sidebar',
  onClick,
  className = '',
  disabled = false,
}: QuickCaptureButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60'

  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={(event) => onClick(event.currentTarget)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-label="Neu erfassen"
        className={`${baseClasses} fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 h-12 min-h-12 border border-accent/20 bg-accent px-4 text-white shadow-lg shadow-accent/20 hover:bg-accent/90 ${className}`}
      >
        <PlusIcon className="h-4 w-4" aria-hidden="true" />
        <span>Neu</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={(event) => onClick(event.currentTarget)}
      disabled={disabled}
      aria-haspopup="dialog"
      className={`${baseClasses} mb-3 w-full min-h-11 border border-accent/20 bg-accent px-4 py-2.5 text-white shadow-sm hover:bg-accent/90 ${className}`}
    >
      <PlusIcon className="h-4 w-4" aria-hidden="true" />
      <span>Neu</span>
    </button>
  )
}
