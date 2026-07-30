'use client'

import { PlusIcon } from '@/components/app/app-icons'

type QuickCaptureButtonProps = {
  variant?: 'inline' | 'floating' | 'sidebar'
  onClick: () => void
  buttonRef?: React.RefObject<HTMLButtonElement | null>
  disabled?: boolean
}

export function QuickCaptureButton({
  variant = 'inline',
  onClick,
  buttonRef,
  disabled = false,
}: QuickCaptureButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60'

  if (variant === 'floating') {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-haspopup="dialog"
        className={`${baseClasses} fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 h-12 min-h-12 border border-accent/20 bg-accent px-4 text-white shadow-lg shadow-accent/20 hover:bg-accent/90 lg:hidden`}
      >
        <PlusIcon className="h-4 w-4" />
        <span>Neu</span>
      </button>
    )
  }

  if (variant === 'sidebar') {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-haspopup="dialog"
        className={`${baseClasses} mb-3 w-full min-h-11 border border-accent/20 bg-accent px-4 py-2.5 text-white shadow-sm hover:bg-accent/90`}
      >
        <PlusIcon className="h-4 w-4" />
        <span>Neu</span>
      </button>
    )
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-haspopup="dialog"
      className={`${baseClasses} hidden min-h-11 border border-accent/20 bg-accent px-4 py-2 text-white shadow-sm hover:bg-accent/90 lg:inline-flex`}
    >
      <PlusIcon className="h-4 w-4" />
      <span>Neu</span>
    </button>
  )
}
