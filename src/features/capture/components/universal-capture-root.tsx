'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { QuickCaptureButton } from '@/components/app/quick-capture-button'
import { CaptureCaseDialog } from '@/features/capture/components/capture-case-dialog'
import { CaptureInformationDialog } from '@/features/capture/components/capture-information-dialog'
import { CaptureTaskDialog } from '@/features/capture/components/capture-task-dialog'
import { QuickActionMenu } from '@/features/capture/components/quick-action-menu'
import { UniversalCaptureDialog } from '@/features/capture/components/universal-capture-dialog'
import type { AgencyMember } from '@/features/agency/types/agency-member'
import {
  isDirectCaseCaptureMode,
  type CaptureMode,
  type CapturePhase,
} from '@/features/capture/types/capture-mode'
import type { DirectCaseTypeKey } from '@/features/cases/lib/validate-create-case'

export type OpenCaptureMenu = (trigger: HTMLButtonElement) => void

type UniversalCaptureRootProps = {
  registerOpener?: (openMenu: OpenCaptureMenu) => void
  onMenuOpenChange?: (isOpen: boolean) => void
  members?: AgencyMember[]
  currentUserId?: string
}

export function UniversalCaptureRoot({
  registerOpener,
  onMenuOpenChange,
  members = [],
  currentUserId = '',
}: UniversalCaptureRootProps) {
  const captureTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [phase, setPhase] = useState<CapturePhase>('closed')
  const [focusAttachments, setFocusAttachments] = useState(false)
  const [menuPlacement, setMenuPlacement] = useState<'toolbar' | 'floating'>('floating')
  const [activeCaseType, setActiveCaseType] = useState<DirectCaseTypeKey>('offer')

  const openMenu = useCallback((trigger: HTMLButtonElement) => {
    captureTriggerRef.current = trigger
    const placement =
      trigger.dataset.capturePlacement === 'toolbar' ? 'toolbar' : 'floating'
    setMenuPlacement(placement)
    setPhase((current) => {
      const next = current === 'menu' ? 'closed' : 'menu'
      onMenuOpenChange?.(next === 'menu')
      return next
    })
  }, [onMenuOpenChange])

  useEffect(() => {
    registerOpener?.(openMenu)
  }, [openMenu, registerOpener])

  const selectMode = useCallback((mode: CaptureMode) => {
    if (mode === 'file') {
      setFocusAttachments(true)
      setPhase('information')
      return
    }

    if (isDirectCaseCaptureMode(mode)) {
      setActiveCaseType(mode)
      setFocusAttachments(false)
      setPhase(mode)
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
    onMenuOpenChange?.(false)
  }, [onMenuOpenChange])

  const defaultAssigneeUserId =
    currentUserId || members[0]?.userId || ''

  return (
    <>
      {/* Mobile: FAB bleibt unverändert */}
      <QuickCaptureButton
        variant="floating"
        onClick={openMenu}
        isExpanded={phase === 'menu' && menuPlacement === 'floating'}
        className="lg:hidden"
        data-capture-placement="floating"
      />

      <QuickActionMenu
        isOpen={phase === 'menu'}
        onSelect={selectMode}
        onClose={closeMenu}
        triggerRef={captureTriggerRef}
        placement={menuPlacement}
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
        members={members}
        currentUserId={currentUserId}
      />

      <CaptureInformationDialog
        isOpen={phase === 'information'}
        onClose={closeAll}
        triggerRef={captureTriggerRef}
        focusAttachments={focusAttachments}
      />

      <CaptureCaseDialog
        caseTypeKey={activeCaseType}
        isOpen={phase === activeCaseType}
        onClose={closeAll}
        triggerRef={captureTriggerRef}
        members={members}
        defaultAssigneeUserId={defaultAssigneeUserId}
      />
    </>
  )
}
