'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { AppNavIconGlyph } from '@/components/app/app-icons'
import {
  DashboardIconCalendar,
  DashboardIconFileText,
  DashboardIconFlag,
  DashboardIconMic,
} from '@/features/dashboard/components/dashboard-icons'
import {
  QUICK_ACTION_GROUPS,
  type CaptureMode,
  type QuickActionIcon,
} from '@/features/capture/types/capture-mode'
import {
  aosDialogOverlayClassName,
  aosDropdownPanelClassName,
  aosTextCardTitleClassName,
} from '@/lib/design-system'

type QuickActionMenuProps = {
  isOpen: boolean
  onSelect: (mode: CaptureMode) => void
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  /** Desktop-Toolbar: Dropdown am Trigger; Mobile-FAB: Bottom Sheet. */
  placement?: 'toolbar' | 'floating'
}

function QuickActionIconGlyph({
  icon,
  className = 'h-5 w-5',
}: {
  icon: QuickActionIcon
  className?: string
}) {
  if (icon === 'offer') {
    return <DashboardIconFileText className={className} />
  }

  if (icon === 'claim') {
    return <DashboardIconFlag className={className} />
  }

  if (icon === 'follow_up') {
    return <DashboardIconCalendar className={className} />
  }

  if (icon === 'voice') {
    return <DashboardIconMic className={className} />
  }

  const navIcon =
    icon === 'tasks'
      ? 'tasks'
      : icon === 'information'
        ? 'information'
        : icon === 'files'
          ? 'files'
          : 'inbox'

  return <AppNavIconGlyph icon={navIcon} className={className} />
}

function QuickActionMenuItems({
  onSelect,
  touchOptimized = false,
}: {
  onSelect: (mode: CaptureMode) => void
  touchOptimized?: boolean
}) {
  const itemClassName = touchOptimized
    ? 'flex w-full min-h-11 items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none active:bg-zinc-100'
    : 'flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none'

  return (
    <ul className="py-1">
      {QUICK_ACTION_GROUPS.map((group, groupIndex) => (
        <li key={groupIndex} role="none">
          {groupIndex > 0 ? (
            <div className="my-1 border-t border-zinc-100" aria-hidden="true" />
          ) : null}
          <ul className="divide-y divide-zinc-100">
            {group.actions.map((action) => (
              <li key={action.mode} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => onSelect(action.mode)}
                  className={itemClassName}
                >
                  <span className="mt-0.5 text-zinc-500">
                    <QuickActionIconGlyph icon={action.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-zinc-900">
                      {action.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-zinc-500">
                      {action.description}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}

function QuickActionBottomSheet({
  isOpen,
  onSelect,
  onClose,
  triggerRef,
}: {
  isOpen: boolean
  onSelect: (mode: CaptureMode) => void
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}) {
  const menuId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

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

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Mobile: the FAB sits over the bottom sheet. The same tap's synthesized click
  // would otherwise hit a menu item (or the overlay) and close the sheet instantly.
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const triggerRect = triggerRef.current?.getBoundingClientRect()
    if (!triggerRect) {
      return
    }

    const pad = 12
    const left = triggerRect.left - pad
    const right = triggerRect.right + pad
    const top = triggerRect.top - pad
    const bottom = triggerRect.bottom + pad
    let armed = true

    function isWithinTrigger(clientX: number, clientY: number) {
      return (
        clientX >= left &&
        clientX <= right &&
        clientY >= top &&
        clientY <= bottom
      )
    }

    function swallowOpeningGesture(event: Event) {
      if (!armed) {
        return
      }

      const point = event as MouseEvent | PointerEvent
      if (
        typeof point.clientX !== 'number' ||
        !isWithinTrigger(point.clientX, point.clientY)
      ) {
        return
      }

      armed = false
      event.preventDefault()
      event.stopPropagation()
    }

    document.addEventListener('click', swallowOpeningGesture, true)
    document.addEventListener('pointerup', swallowOpeningGesture, true)

    const timeoutId = window.setTimeout(() => {
      armed = false
    }, 400)

    return () => {
      document.removeEventListener('click', swallowOpeningGesture, true)
      document.removeEventListener('pointerup', swallowOpeningGesture, true)
      window.clearTimeout(timeoutId)
    }
  }, [isOpen, triggerRef])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        aria-label="Menü schließen"
        className={aosDialogOverlayClassName}
        onClick={onClose}
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        id={menuId}
        role="menu"
        aria-label="Neu erstellen"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(85dvh,100dvh)] flex-col rounded-t-2xl border border-zinc-200/80 bg-white shadow-xl"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex shrink-0 justify-center pt-3 pb-1" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-zinc-200" />
        </div>

        <div className="shrink-0 border-b border-zinc-100 px-5 pb-3">
          <h2 className={aosTextCardTitleClassName}>Neu erstellen</h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <QuickActionMenuItems onSelect={onSelect} touchOptimized />
        </div>
      </div>
    </div>
  )
}

export function QuickActionMenu({
  isOpen,
  onSelect,
  onClose,
  triggerRef,
  placement = 'floating',
}: QuickActionMenuProps) {
  const menuId = useId()
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (!isOpen || placement !== 'toolbar') {
      return
    }

    function updatePosition() {
      const trigger = triggerRef.current
      const menu = menuRef.current

      if (!trigger || !menu) {
        return
      }

      const rect = trigger.getBoundingClientRect()
      const menuWidth = menu.offsetWidth || 288
      const gap = 8
      const top = rect.bottom + gap
      const left = Math.min(
        Math.max(16, rect.right - menuWidth),
        window.innerWidth - menuWidth - 16,
      )

      setMenuStyle({
        top: `${top}px`,
        left: `${left}px`,
        width: `${menuWidth}px`,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, placement, triggerRef])

  useEffect(() => {
    if (!isOpen || placement !== 'toolbar') {
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
  }, [isOpen, onClose, placement, triggerRef])

  if (!isOpen) {
    return null
  }

  if (placement === 'floating') {
    return (
      <QuickActionBottomSheet
        isOpen={isOpen}
        onSelect={onSelect}
        onClose={onClose}
        triggerRef={triggerRef}
      />
    )
  }

  return (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label="Neu erstellen"
      className={`${aosDropdownPanelClassName} fixed z-50 w-72`}
      style={menuStyle}
    >
      <QuickActionMenuItems onSelect={onSelect} />
    </div>
  )
}
