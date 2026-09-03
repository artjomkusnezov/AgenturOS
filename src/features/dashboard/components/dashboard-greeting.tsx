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
    <header className="dashboard-greeting space-y-0.5">
      <p className="dashboard-greeting__date text-[11px] font-medium">{getGermanDateLabel()}</p>
      <h1 className="dashboard-greeting__title text-xl font-semibold tracking-tight sm:text-2xl">
        {greeting}
        {firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="dashboard-greeting__hint max-w-3xl text-xs leading-relaxed" aria-live="polite">
        {situationHint}
      </p>
    </header>
  )
}
