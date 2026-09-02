import { AgenturzentraleCommandRail } from '@/features/dashboard/components/agenturzentrale-command-rail'
import { AgenturzentraleDayRhythm } from '@/features/dashboard/components/agenturzentrale-day-rhythm'
import { AgenturzentraleHero } from '@/features/dashboard/components/agenturzentrale-hero'
import { AgenturzentraleLageHeute } from '@/features/dashboard/components/agenturzentrale-lage-heute'
import { DashboardAttentionSection } from '@/features/dashboard/components/dashboard-attention-section'
import { DashboardInboxSection } from '@/features/dashboard/components/dashboard-inbox-section'
import { DashboardMyTasksSection } from '@/features/dashboard/components/dashboard-my-tasks-section'
import { DashboardMyWorkSection } from '@/features/dashboard/components/dashboard-my-work-section'
import type { DashboardAttentionItem } from '@/features/dashboard/lib/dashboard-attention'
import type {
  DashboardCaseTypeCount,
  DashboardMyWorkCaseItem,
} from '@/features/dashboard/lib/dashboard-my-work'
import type { DashboardTaskItem, DashboardTeamTasksResult } from '@/features/dashboard/lib/dashboard-tasks'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'
import type { AgencyMember } from '@/features/agency/types/agency-member'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export type DashboardWorkOverviewProps = {
  user: {
    id: string
    user_metadata?: Record<string, unknown>
  }
  members: AgencyMember[]
  unprocessedInboxItems: InboxItem[]
  attentionItems: DashboardAttentionItem[]
  attentionCount: number
  overdueAttentionCount: number
  myTasks: DashboardTaskItem[]
  myOpenTaskCount: number
  teamTasks: DashboardTeamTasksResult
  caseTypeCounts: DashboardCaseTypeCount[]
  recentlyUpdated: DashboardMyWorkCaseItem[]
  memberNameMap?: Record<string, string>
}

const AGENTURZENTRALE_VARIANT = 'agenturzentrale' as const

export function DashboardWorkOverview({
  user,
  members,
  unprocessedInboxItems,
  attentionItems,
  attentionCount,
  overdueAttentionCount,
  myTasks,
  myOpenTaskCount,
  teamTasks,
  caseTypeCounts,
  recentlyUpdated,
  memberNameMap = {},
}: DashboardWorkOverviewProps) {
  const safeInboxItems = Array.isArray(unprocessedInboxItems) ? unprocessedInboxItems : []
  const safeAttentionItems = Array.isArray(attentionItems) ? attentionItems : []
  const safeMyTasks = Array.isArray(myTasks) ? myTasks : []
  const safeCaseTypeCounts = Array.isArray(caseTypeCounts) ? caseTypeCounts : []
  const safeRecentlyUpdated = Array.isArray(recentlyUpdated) ? recentlyUpdated : []
  const safeMembers = Array.isArray(members) ? members : []
  const safeTeamTasks: DashboardTeamTasksResult = {
    members: Array.isArray(teamTasks?.members) ? teamTasks.members : [],
    unassigned: {
      openCount: sanitizeDashboardCount(teamTasks?.unassigned?.openCount ?? 0),
      overdueCount: sanitizeDashboardCount(teamTasks?.unassigned?.overdueCount ?? 0),
      previewTasks: Array.isArray(teamTasks?.unassigned?.previewTasks)
        ? teamTasks.unassigned.previewTasks
        : [],
    },
    totalTeamOpenCount: sanitizeDashboardCount(teamTasks?.totalTeamOpenCount ?? 0),
  }

  const unprocessedInboxCount = sanitizeDashboardCount(safeInboxItems.length)
  const safeAttentionCount = sanitizeDashboardCount(attentionCount)
  const safeOverdueAttentionCount = sanitizeDashboardCount(overdueAttentionCount)
  const safeMyOpenTaskCount = sanitizeDashboardCount(myOpenTaskCount)
  const safeTeamOpenTaskCount = sanitizeDashboardCount(safeTeamTasks.totalTeamOpenCount)

  return (
    <div className="agenturzentrale-root min-h-full space-y-4 pb-2 lg:space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)] lg:items-start lg:gap-5">
        <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1 lg:space-y-5">
          <AgenturzentraleHero
            user={user}
            unprocessedInboxCount={unprocessedInboxCount}
            attentionCount={safeAttentionCount}
            myOpenTaskCount={safeMyOpenTaskCount}
            teamOpenTaskCount={safeTeamOpenTaskCount}
          />

          <AgenturzentraleLageHeute
            unprocessedInboxCount={unprocessedInboxCount}
            attentionCount={safeAttentionCount}
            myOpenTaskCount={safeMyOpenTaskCount}
            teamOpenTaskCount={safeTeamOpenTaskCount}
            overdueAttentionCount={safeOverdueAttentionCount}
          />
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <AgenturzentraleCommandRail
            members={safeMembers}
            teamTasks={safeTeamTasks}
            currentUserId={user.id}
            currentUserTasks={safeMyTasks}
            currentUserOpenCount={safeMyOpenTaskCount}
            currentUserOverdueCount={safeMyTasks.filter((task) => task.isOverdue).length}
          />
        </div>

        <div className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-2">
          <div className="az-cockpit-divider hidden lg:block" aria-hidden="true" />
          <h2 className="az-cockpit-zone-label">Operative Zonen</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:gap-4">
            <DashboardInboxSection
              title="Was braucht mich jetzt?"
              items={safeInboxItems}
              memberNameMap={memberNameMap}
              variant={AGENTURZENTRALE_VARIANT}
            />
            <DashboardAttentionSection
              items={safeAttentionItems}
              totalCount={safeAttentionCount}
              variant={AGENTURZENTRALE_VARIANT}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:gap-4">
            <DashboardMyWorkSection
              title="Aktive Vorgänge"
              caseTypeCounts={safeCaseTypeCounts}
              recentlyUpdated={safeRecentlyUpdated}
              variant={AGENTURZENTRALE_VARIANT}
            />
            <DashboardMyTasksSection
              title="Mein nächster Schritt"
              tasks={safeMyTasks}
              totalCount={safeMyOpenTaskCount}
              variant={AGENTURZENTRALE_VARIANT}
            />
          </div>
        </div>
      </div>

      <AgenturzentraleDayRhythm />
    </div>
  )
}
