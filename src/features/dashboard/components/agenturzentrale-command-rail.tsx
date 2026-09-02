import Link from 'next/link'

import type { AgencyMember } from '@/features/agency/types/agency-member'
import { DashboardIconTarget } from '@/features/dashboard/components/dashboard-icons'
import type { DashboardTeamTasksResult } from '@/features/dashboard/lib/dashboard-tasks'
import { azSurfaceClassName } from '@/features/dashboard/lib/agenturzentrale-surface'
import { DASHBOARD_WEEKLY_GOAL_DEMO } from '@/features/dashboard/lib/dashboard-weekly-goal-demo'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'

type AgenturzentraleCommandRailProps = {
  members: AgencyMember[]
  teamTasks: DashboardTeamTasksResult
  currentUserId: string
}

function memberInitials(member: AgencyMember): string {
  const first = member.firstName?.trim().charAt(0) ?? ''
  const last = member.lastName?.trim().charAt(0) ?? ''
  const combined = `${first}${last}`.toUpperCase()
  if (combined.length >= 2) {
    return combined
  }
  const fromDisplay = member.displayName.trim().slice(0, 2).toUpperCase()
  return fromDisplay.length > 0 ? fromDisplay : '?'
}

function avatarTone(userId: string): string {
  const tones = [
    'from-blue-500/80 to-blue-700/80',
    'from-emerald-500/80 to-emerald-700/80',
    'from-violet-500/80 to-violet-700/80',
    'from-amber-500/80 to-amber-700/80',
    'from-rose-500/80 to-rose-700/80',
  ]
  let hash = 0
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash + userId.charCodeAt(index)) % tones.length
  }
  return tones[hash] ?? tones[0]!
}

function TeamPresenceCard({
  member,
  openCount,
  overdueCount,
  isCurrentUser,
}: {
  member: AgencyMember
  openCount: number
  overdueCount: number
  isCurrentUser: boolean
}) {
  const safeOpen = sanitizeDashboardCount(openCount)
  const safeOverdue = sanitizeDashboardCount(overdueCount)

  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--az-bg-panel-hover)]">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white shadow-md ${avatarTone(member.userId)}`}
        aria-hidden="true"
      >
        {memberInitials(member)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] font-medium text-[var(--az-text-primary)]">
          {member.displayName}
          {isCurrentUser ? (
            <span className="ml-1.5 text-[10px] font-normal text-[var(--az-accent-blue)]">
              Du
            </span>
          ) : null}
        </p>
        <p className="text-[10px] text-[var(--az-text-muted)]">
          {safeOpen === 0
            ? 'Keine offenen Aufgaben'
            : safeOpen === 1
              ? '1 Aufgabe offen'
              : `${safeOpen} Aufgaben offen`}
          {safeOverdue > 0 ? ` · ${safeOverdue} überfällig` : ''}
        </p>
      </div>
      {safeOpen > 0 ? (
        <span className="shrink-0 rounded-full bg-[var(--az-accent-blue)]/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--az-accent-blue)]">
          {safeOpen}
        </span>
      ) : (
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400/70" title="Frei" />
      )}
    </div>
  )
}

export function AgenturzentraleCommandRail({
  members,
  teamTasks,
  currentUserId,
}: AgenturzentraleCommandRailProps) {
  const taskByMember = new Map(
    teamTasks.members.map((entry) => [entry.userId, entry]),
  )
  const demoGoal = DASHBOARD_WEEKLY_GOAL_DEMO
  const progressPercent = Math.round((demoGoal.current / demoGoal.target) * 100)

  return (
    <aside
      aria-labelledby="command-rail-heading"
      className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start"
    >
      <section className={`${azSurfaceClassName} p-4`}>
        <div className="flex items-center justify-between gap-2">
          <h2
            id="command-rail-heading"
            className="text-[0.8125rem] font-semibold tracking-tight text-[var(--az-text-primary)]"
          >
            Team heute
          </h2>
          <Link
            href="/app/tasks"
            className="text-[10px] font-medium text-[var(--az-accent-blue)] hover:opacity-80"
          >
            Alle Aufgaben
          </Link>
        </div>

        <div className="mt-3 divide-y divide-[var(--az-border-subtle)]">
          {members.length === 0 ? (
            <p className="py-2 text-xs text-[var(--az-text-muted)]">
              Keine Teammitglieder geladen.
            </p>
          ) : (
            members.map((member) => {
              const stats = taskByMember.get(member.userId)
              return (
                <TeamPresenceCard
                  key={member.userId}
                  member={member}
                  openCount={stats?.openCount ?? 0}
                  overdueCount={stats?.overdueCount ?? 0}
                  isCurrentUser={member.userId === currentUserId}
                />
              )
            })
          )}

          {teamTasks.unassigned.openCount > 0 ? (
            <div className="flex items-center gap-2.5 px-2 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-500/50 text-xs text-zinc-400">
                ?
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-medium text-[var(--az-text-primary)]">
                  Nicht zugeordnet
                </p>
                <p className="text-[10px] text-[var(--az-text-muted)]">
                  {teamTasks.unassigned.openCount} offen
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className={`${azSurfaceClassName} p-4`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[0.8125rem] font-semibold tracking-tight text-[var(--az-text-primary)]">
            Wochenziel
          </h2>
          <span className="az-demo-badge">Demo</span>
        </div>
        <div className="mt-3">
          <div className="flex items-start gap-3">
            <DashboardIconTarget className="mt-0.5 h-5 w-5 shrink-0 text-[var(--az-accent-emerald)]" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--az-text-primary)]">{demoGoal.name}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--az-text-muted)]">
                {demoGoal.description}
              </p>
              <div className="mt-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold tabular-nums text-[var(--az-text-primary)]">
                    {demoGoal.current}/{demoGoal.target}
                  </span>
                  <span className="text-[10px] text-[var(--az-text-muted)]">{progressPercent}%</span>
                </div>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-700/60"
                  role="progressbar"
                  aria-valuenow={demoGoal.current}
                  aria-valuemin={0}
                  aria-valuemax={demoGoal.target}
                  aria-label={`Demo-Wochenziel ${demoGoal.current} von ${demoGoal.target}`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-emerald-400/60"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${azSurfaceClassName} p-4`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[0.8125rem] font-semibold tracking-tight text-[var(--az-text-primary)]">
            Agentur-Puls
          </h2>
          <span className="az-demo-badge">Geplant</span>
        </div>
        <ul className="mt-3 space-y-2">
          {[
            'Tagesabschluss-Routine',
            'Team-Standup',
            'Wochenstatistik',
          ].map((label) => (
            <li
              key={label}
              className="flex items-center justify-between gap-2 rounded-md border border-dashed border-zinc-600/40 px-2.5 py-2"
            >
              <span className="text-[11px] text-[var(--az-text-secondary)]">{label}</span>
              <span className="text-[10px] text-[var(--az-text-muted)]">Bald</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
