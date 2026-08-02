'use client'

import { useEffect, useId, useRef } from 'react'

import { AppNavIconGlyph } from '@/components/app/app-icons'
import { QUICK_ACTIONS, type CaptureMode } from '@/features/capture/types/capture-mode'
import { aosDropdownPanelClassName } from '@/lib/design-system'

type QuickActionMenuProps = {
  isOpen: boolean
  onSelect: (mode: CaptureMode) => void
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

export function QuickActionMenu({
  isOpen,
  onSelect,
  onClose,
  triggerRef,
}: QuickActionMenuProps) {
  const menuId = useId()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node

      if (menuRef.current?.contains(target)) {
        return
      }

      if (triggerRef.current?.contains(target)) {
        return
      }

      onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isOpen, onClose, triggerRef])

  if (!isOpen) {
    return null
  }

  return (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label="Schnellerfassung"
      className={`${aosDropdownPanelClassName} fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-4 z-40 w-[min(calc(100vw-2rem),18rem)] lg:bottom-[4.75rem] lg:right-6`}
    >
      <ul className="divide-y divide-zinc-100 py-1">
        {QUICK_ACTIONS.map((action) => (
          <li key={action.mode} role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => onSelect(action.mode)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none"
            >
              <span className="mt-0.5 text-zinc-500">
                <AppNavIconGlyph icon={action.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-zinc-900">{action.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-zinc-500">
                  {action.description}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
