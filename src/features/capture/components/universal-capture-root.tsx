'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { QuickCaptureButton } from '@/components/app/quick-capture-button'
import { CaptureInformationDialog } from '@/features/capture/components/capture-information-dialog'
import { CaptureTaskDialog } from '@/features/capture/components/capture-task-dialog'
import { QuickActionMenu } from '@/features/capture/components/quick-action-menu'
import { UniversalCaptureDialog } from '@/features/capture/components/universal-capture-dialog'
import type { CaptureMode, CapturePhase } from '@/features/capture/types/capture-mode'

export type OpenCaptureMenu = (trigger: HTMLButtonElement) => void

type UniversalCaptureRootProps = {
  registerOpener?: (openMenu: OpenCaptureMenu) => void
  showFloatingButton?: boolean
  floatingButtonClassName?: string
}

export function UniversalCaptureRoot({
  registerOpener,
  showFloatingButton = true,
  floatingButtonClassName = '',
}: UniversalCaptureRootProps) {
  const captureTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [phase, setPhase] = useState<CapturePhase>('closed')
  const [focusAttachments, setFocusAttachments] = useState(false)

  const openMenu = useCallback((trigger: HTMLButtonElement) => {
    captureTriggerRef.current = trigger
    setPhase((current) => (current === 'menu' ? 'closed' : 'menu'))
  }, [])

  useEffect(() => {
    registerOpener?.(openMenu)
  }, [openMenu, registerOpener])

  const selectMode = useCallback((mode: CaptureMode) => {
    if (mode === 'file') {
      setFocusAttachments(true)
      setPhase('information')
      return
    }

    setFocusAttachments(false)
    setPhase(mode)
  }, [])

  const closeAll = useCallback(() => {
    setFocusAttachments(false)
    setPhase('closed')
  }, [])

  const closeMenu = useCallback(() => {
    setPhase('closed')
  }, [])

  return (
    <>
      {showFloatingButton ? (
        <QuickCaptureButton
          variant="floating"
          onClick={openMenu}
          isExpanded={phase === 'menu'}
          className={floatingButtonClassName}
        />
      ) : null}

      <QuickActionMenu
        isOpen={phase === 'menu'}
        onSelect={selectMode}
        onClose={closeMenu}
        triggerRef={captureTriggerRef}
      />

      <UniversalCaptureDialog
        isOpen={phase === 'inbox'}
        onClose={closeAll}
        triggerRef={captureTriggerRef}
      />

      <CaptureTaskDialog
        isOpen={phase === 'task'}
        onClose={closeAll}
        triggerRef={captureTriggerRef}
      />

      <CaptureInformationDialog
        isOpen={phase === 'information'}
        onClose={closeAll}
        triggerRef={captureTriggerRef}
        focusAttachments={focusAttachments}
      />
    </>
  )
}
