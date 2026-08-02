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
  openTaskCount: number
  informationCount: number
}

export function DashboardGreeting({
  user,
  unprocessedInboxCount,
  openTaskCount,
  informationCount,
}: DashboardGreetingProps) {
  const greeting = getTimeOfDayGreeting()
  const firstName = getFirstNameFromUser(user)
  const situationHint = getWorkSituationHint({
    unprocessedInboxCount,
    openTaskCount,
    informationCount,
  })

  return (
    <header className="space-y-1">
      <p className="text-xs font-medium text-zinc-400">{getGermanDateLabel()}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
        {greeting}
        {firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="max-w-2xl text-sm leading-snug text-zinc-500" aria-live="polite">
        {situationHint}
      </p>
    </header>
  )
}
