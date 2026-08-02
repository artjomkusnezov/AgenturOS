'use client'

import { PlusIcon } from '@/components/app/app-icons'
import {
  aosBtnPrimaryClassName,
  aosCaptureFloatingBtnClassName,
  aosCaptureFloatingClassName,
  aosCaptureSidebarClassName,
  aosCaptureToolbarClassName,
} from '@/lib/design-system'

type QuickCaptureButtonProps = {
  variant?: 'floating' | 'sidebar' | 'toolbar'
  onClick: (trigger: HTMLButtonElement) => void
  className?: string
  disabled?: boolean
  isExpanded?: boolean
  'data-capture-placement'?: 'toolbar' | 'floating'
}

export function QuickCaptureButton({
  variant = 'sidebar',
  onClick,
  className = '',
  disabled = false,
  isExpanded = false,
  'data-capture-placement': capturePlacement,
}: QuickCaptureButtonProps) {
  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={(event) => onClick(event.currentTarget)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isExpanded}
        aria-label="Neu erstellen"
        data-capture-placement={capturePlacement ?? 'floating'}
        className={`${aosCaptureFloatingBtnClassName} ${aosCaptureFloatingClassName} ${className}`}
      >
        <PlusIcon className="h-4 w-4" aria-hidden="true" />
        <span>Neu</span>
      </button>
    )
  }

  if (variant === 'toolbar') {
    return (
      <button
        type="button"
        onClick={(event) => onClick(event.currentTarget)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isExpanded}
        data-capture-placement={capturePlacement ?? 'toolbar'}
        className={`${aosBtnPrimaryClassName} ${aosCaptureToolbarClassName} ${className}`}
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
      aria-haspopup="menu"
      aria-expanded={isExpanded}
      data-capture-placement={capturePlacement ?? 'floating'}
      className={`${aosBtnPrimaryClassName} ${aosCaptureSidebarClassName} min-h-11 gap-2 px-4 ${className}`}
    >
      <PlusIcon className="h-4 w-4" aria-hidden="true" />
      <span>Neu</span>
    </button>
  )
}
