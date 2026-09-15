import Link from 'next/link'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconInbox } from '@/features/dashboard/components/dashboard-icons'
import {
  aosWorkspaceActionAccentClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type TaskSourceInboxLinkProps = {
  href: string
  label: string
  sourceLabel?: string | null
}

export function TaskSourceInboxLink({
  href,
  label,
  sourceLabel = null,
}: TaskSourceInboxLinkProps) {
  return (
    <section aria-label="Ursprünglicher Eingang" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Ursprünglicher Eingang"
        accent="orange"
        icon={<DashboardIconInbox className="h-4 w-4" />}
      />
      {sourceLabel ? <p className={aosWorkspaceMetaClassName}>{sourceLabel}</p> : null}
      <div className={sourceLabel ? 'mt-3' : undefined}>
        <Link href={href} className={aosWorkspaceActionAccentClassName}>
          {label}
        </Link>
      </div>
    </section>
  )
}
