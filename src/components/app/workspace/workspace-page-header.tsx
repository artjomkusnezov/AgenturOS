import {
  aosTextMetaClassName,
  aosTextPageTitleClassName,
  aosWorkspacePageHeaderClassName,
} from '@/lib/design-system'

type WorkspacePageHeaderProps = {
  title: string
  description?: string
}

export function WorkspacePageHeader({ title, description }: WorkspacePageHeaderProps) {
  return (
    <header className={aosWorkspacePageHeaderClassName}>
      <h1 className={aosTextPageTitleClassName}>{title}</h1>
      {description ? <p className={aosTextMetaClassName}>{description}</p> : null}
    </header>
  )
}
