import {
  aosWorkspaceDetailPaneClassName,
  aosWorkspaceListPaneClassName,
  aosWorkspaceListScrollClassName,
  aosWorkspaceSplitClassName,
} from '@/lib/design-system'

type WorkspaceSplitProps = {
  listLabel: string
  detailLabel: string
  showMobileDetail: boolean
  list: React.ReactNode
  detail: React.ReactNode
}

export function WorkspaceSplit({
  listLabel,
  detailLabel,
  showMobileDetail,
  list,
  detail,
}: WorkspaceSplitProps) {
  return (
    <div className={aosWorkspaceSplitClassName}>
      <section
        aria-label={listLabel}
        className={`${aosWorkspaceListPaneClassName} ${
          showMobileDetail ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className={aosWorkspaceListScrollClassName}>{list}</div>
      </section>

      <section
        aria-label={detailLabel}
        className={`${aosWorkspaceDetailPaneClassName} ${
          showMobileDetail ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {detail}
      </section>
    </div>
  )
}
