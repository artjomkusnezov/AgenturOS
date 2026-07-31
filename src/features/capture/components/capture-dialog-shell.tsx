'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'

import { CloseIcon } from '@/components/app/app-icons'
import {
  aosDialogOverlayClassName,
  aosDialogPanelLgClassName,
  aosIconButtonClassName,
  aosPanelFooterClassName,
  aosPanelHeaderClassName,
  aosTextCardTitleClassName,
  aosTextMetaClassName,
} from '@/lib/design-system'

type CaptureDialogShellProps = {
  isOpen: boolean
  title: string
  description: string
  onClose: () => void
  closeDisabled?: boolean
  triggerRef: React.RefObject<HTMLButtonElement | null>
  children: ReactNode
  footer?: ReactNode
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function CaptureDialogShell({
  isOpen,
  title,
  description,
  onClose,
  closeDisabled = false,
  triggerRef,
  children,
  footer,
}: CaptureDialogShellProps) {
  const dialogTitleId = useId()
  const dialogDescriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const panel = panelRef.current
    const triggerElement = triggerRef.current

    function getFocusableElements(): HTMLElement[] {
      if (!panel) {
        return []
      }

      return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
      )
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !closeDisabled) {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusableElements = getFocusableElements()

      if (focusableElements.length === 0) {
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    closeButtonRef.current?.focus()
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      triggerElement?.focus()
    }
  }, [closeDisabled, isOpen, onClose, triggerRef])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Dialog schließen"
        className={aosDialogOverlayClassName}
        onClick={onClose}
        disabled={closeDisabled}
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        className={`${aosDialogPanelLgClassName} max-h-[min(92vh,100dvh)]`}
      >
        <div className={`${aosPanelHeaderClassName} flex items-start justify-between gap-3 px-5 py-4`}>
          <div>
            <h2 id={dialogTitleId} className={aosTextCardTitleClassName}>
              {title}
            </h2>
            <p id={dialogDescriptionId} className={`mt-1 ${aosTextMetaClassName}`}>
              {description}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Dialog schließen"
            className={aosIconButtonClassName}
          >
            <CloseIcon className="h-[1.125rem] w-[1.125rem]" />
          </button>
        </div>

        {children}

        {footer ? (
          <div className={`${aosPanelFooterClassName} px-5 py-4`}>{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
