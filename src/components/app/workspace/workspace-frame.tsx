'use client'

import { usePathname } from 'next/navigation'

import { WorkspacePageHeader } from '@/components/app/workspace/workspace-page-header'
import { WorkspaceToolbar } from '@/components/app/workspace/workspace-toolbar'
import { getNavItemByPathname } from '@/config/app-navigation'
import {
  aosWorkspaceBodyClassName,
  aosWorkspaceBodyCompactClassName,
  aosWorkspaceChromeClassName,
  aosWorkspaceChromeTitleClassName,
  aosWorkspacePageClassName,
  aosWorkspacePageCompactClassName,
  aosWorkspaceToolbarActionsClassName,
  aosWorkspaceToolbarMetaClassName,
} from '@/lib/design-system'

type WorkspaceFrameProps = {
  children: React.ReactNode
  title?: string
  description?: string
  meta?: React.ReactNode
  secondary?: React.ReactNode
  primary?: React.ReactNode
  className?: string
  bodyClassName?: string
  narrow?: boolean
  /** Unterdrückt den generischen Seitenkopf (z. B. Dashboard mit eigener Begrüßung). */
  hidePageHeader?: boolean
  /**
   * Kompakter Arbeitsplatz-Chrome: Titel + Meta + Aktionen in einer Zeile,
   * ohne Beschreibungs-Hierarchie. Für Eingang / Aufgaben / Informationen.
   */
  compact?: boolean
}

export function WorkspaceFrame({
  children,
  title,
  description,
  meta,
  secondary,
  primary,
  className = '',
  bodyClassName = '',
  narrow = false,
  hidePageHeader = false,
  compact = false,
}: WorkspaceFrameProps) {
  const pathname = usePathname()
  const navItem = getNavItemByPathname(pathname)
  const pageTitle = title ?? navItem?.title ?? 'AgenturOS'
  const pageDescription = description ?? navItem?.description
  const hasToolbar = Boolean(meta || secondary || primary)

  if (compact) {
    return (
      <div
        className={`${aosWorkspacePageCompactClassName} ${narrow ? 'max-w-3xl' : ''} ${className}`}
      >
        <div className={aosWorkspaceChromeClassName}>
          <h1 className={aosWorkspaceChromeTitleClassName}>{pageTitle}</h1>
          {meta ? (
            <div className={`${aosWorkspaceToolbarMetaClassName} min-w-0 flex-1`}>{meta}</div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          {(secondary || primary) && (
            <div className={aosWorkspaceToolbarActionsClassName}>
              {secondary}
              {primary}
            </div>
          )}
        </div>
        <div className={`${aosWorkspaceBodyCompactClassName} ${bodyClassName}`}>{children}</div>
      </div>
    )
  }

  return (
    <div
      className={`${aosWorkspacePageClassName} ${narrow ? 'max-w-3xl' : ''} ${className}`}
    >
      {!hidePageHeader ? (
        <WorkspacePageHeader title={pageTitle} description={pageDescription} />
      ) : null}
      {hasToolbar ? (
        <WorkspaceToolbar meta={meta} secondary={secondary} primary={primary} />
      ) : null}
      <div
        className={`${aosWorkspaceBodyClassName} ${hidePageHeader ? 'pt-0' : ''} ${bodyClassName}`}
      >
        {children}
      </div>
    </div>
  )
}
