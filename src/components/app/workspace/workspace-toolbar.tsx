import {
  aosWorkspaceToolbarActionsClassName,
  aosWorkspaceToolbarClassName,
  aosWorkspaceToolbarMetaClassName,
} from '@/lib/design-system'

type WorkspaceToolbarProps = {
  meta?: React.ReactNode
  secondary?: React.ReactNode
  primary?: React.ReactNode
}

export function WorkspaceToolbar({ meta, secondary, primary }: WorkspaceToolbarProps) {
  if (!meta && !secondary && !primary) {
    return null
  }

  return (
    <div className={aosWorkspaceToolbarClassName} role="toolbar" aria-label="Seitenwerkzeuge">
      {meta ? <div className={aosWorkspaceToolbarMetaClassName}>{meta}</div> : <div />}
      {(secondary || primary) && (
        <div className={aosWorkspaceToolbarActionsClassName}>
          {secondary}
          {primary}
        </div>
      )}
    </div>
  )
}
