'use client'

import { PlusIcon } from '@/components/app/app-icons'
import {
  aosBtnPrimaryClassName,
  aosCaptureFloatingBtnClassName,
  aosCaptureFloatingClassName,
  aosCaptureSidebarClassName,
} from '@/lib/design-system'

type QuickCaptureButtonProps = {
  variant?: 'floating' | 'sidebar'
  onClick: (trigger: HTMLButtonElement) => void
  className?: string
  disabled?: boolean
  isExpanded?: boolean
}

export function QuickCaptureButton({
  variant = 'sidebar',
  onClick,
  className = '',
  disabled = false,
  isExpanded = false,
}: QuickCaptureButtonProps) {
  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={(event) => onClick(event.currentTarget)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isExpanded}
        aria-label="Schnellerfassung"
        className={`${aosCaptureFloatingBtnClassName} ${aosCaptureFloatingClassName} ${className}`}
      >
        <PlusIcon className="h-4 w-4" aria-hidden="true" />
        <span className="lg:hidden">Neu</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={(event) => onClick(event.currentTarget)}
      disabled={disabled}
      aria-haspopup="menu"
      aria-expanded={isExpanded}
      className={`${aosBtnPrimaryClassName} ${aosCaptureSidebarClassName} min-h-11 gap-2 px-4 ${className}`}
    >
      <PlusIcon className="h-4 w-4" aria-hidden="true" />
      <span>Neu</span>
    </button>
  )
}
