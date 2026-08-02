'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { AppNavIconGlyph } from '@/components/app/app-icons'
import {
  DashboardIconCalendar,
  DashboardIconFileText,
  DashboardIconFlag,
} from '@/features/dashboard/components/dashboard-icons'
import {
  QUICK_ACTION_GROUPS,
  type CaptureMode,
  type QuickActionIcon,
} from '@/features/capture/types/capture-mode'
import { aosDropdownPanelClassName } from '@/lib/design-system'

type QuickActionMenuProps = {
  isOpen: boolean
  onSelect: (mode: CaptureMode) => void
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  /** Desktop-Toolbar: Dropdown am Trigger; Mobile-FAB: über dem Button. */
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
    if (!isOpen) {
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

      if (placement === 'toolbar') {
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
        return
      }

      const bottom = window.innerHeight - rect.top + gap
      setMenuStyle({
        bottom: `${bottom}px`,
        right: `${Math.max(16, window.innerWidth - rect.right)}px`,
        width: 'min(calc(100vw - 2rem), 18rem)',
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

  const panelClassName =
    placement === 'toolbar'
      ? `${aosDropdownPanelClassName} fixed z-50 w-72`
      : `${aosDropdownPanelClassName} fixed z-40 w-[min(calc(100vw-2rem),18rem)]`

  return (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label="Neu erstellen"
      className={panelClassName}
      style={menuStyle}
    >
      <ul className="py-1">
        {QUICK_ACTION_GROUPS.map((group, groupIndex) => (
          <li key={groupIndex} role="none">
            {groupIndex > 0 ? <div className="my-1 border-t border-zinc-100" aria-hidden="true" /> : null}
            <ul className="divide-y divide-zinc-100">
              {group.actions.map((action) => (
                <li key={action.mode} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => onSelect(action.mode)}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none"
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
    </div>
  )
}
