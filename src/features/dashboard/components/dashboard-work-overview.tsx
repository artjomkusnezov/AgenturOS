import { DashboardVariantProvider } from '@/features/dashboard/context/dashboard-variant-context'
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

type DashboardWorkOverviewProps = {
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

  const unprocessedInboxCount = sanitizeDashboardCount(safeInboxItems.length)
  const safeAttentionCount = sanitizeDashboardCount(attentionCount)
  const safeOverdueAttentionCount = sanitizeDashboardCount(overdueAttentionCount)
  const safeMyOpenTaskCount = sanitizeDashboardCount(myOpenTaskCount)
  const safeTeamOpenTaskCount = sanitizeDashboardCount(teamTasks.totalTeamOpenCount)

  return (
    <DashboardVariantProvider variant="agenturzentrale">
      <div className="agenturzentrale-root min-h-full space-y-4 pb-2 lg:space-y-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_17.5rem] xl:gap-5">
          <div className="min-w-0 space-y-4 lg:space-y-5">
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

            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--az-text-muted)]">
                Operative Zonen
              </h2>

              <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
                <DashboardInboxSection
                  title="Was braucht mich jetzt?"
                  items={safeInboxItems}
                  memberNameMap={memberNameMap}
                />
                <DashboardAttentionSection
                  items={safeAttentionItems}
                  totalCount={safeAttentionCount}
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
                <DashboardMyWorkSection
                  title="Aktive Vorgänge"
                  caseTypeCounts={safeCaseTypeCounts}
                  recentlyUpdated={safeRecentlyUpdated}
                />
                <DashboardMyTasksSection
                  title="Mein nächster Schritt"
                  tasks={safeMyTasks}
                  totalCount={safeMyOpenTaskCount}
                />
              </div>
            </div>
          </div>

          <div className="min-w-0 xl:block">
            <AgenturzentraleCommandRail
              members={members}
              teamTasks={teamTasks}
              currentUserId={user.id}
            />
          </div>
        </div>

        <AgenturzentraleDayRhythm />
      </div>
    </DashboardVariantProvider>
  )
}
