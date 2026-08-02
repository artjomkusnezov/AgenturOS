import { getGermanDateLabel } from '@/lib/user/get-display-name'
import {
  getFirstNameFromUser,
  getTimeOfDayGreeting,
  getWorkSituationHint,
} from '@/features/dashboard/lib/dashboard-greeting'

type DashboardGreetingProps = {
  user: {
    user_metadata?: Record<string, unknown>
  }
  unprocessedInboxCount: number
  attentionCount: number
  myOpenTaskCount: number
  teamOpenTaskCount: number
}

export function DashboardGreeting({
  user,
  unprocessedInboxCount,
  attentionCount,
  myOpenTaskCount,
  teamOpenTaskCount,
}: DashboardGreetingProps) {
  const greeting = getTimeOfDayGreeting()
  const firstName = getFirstNameFromUser(user)
  const situationHint = getWorkSituationHint({
    unprocessedInboxCount,
    attentionCount,
    myOpenTaskCount,
    teamOpenTaskCount,
  })

  return (
    <header className="space-y-0.5">
      <p className="text-[11px] font-medium text-zinc-400">{getGermanDateLabel()}</p>
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
        {greeting}
        {firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="max-w-3xl text-xs leading-relaxed text-zinc-500" aria-live="polite">
        {situationHint}
      </p>
    </header>
  )
}
