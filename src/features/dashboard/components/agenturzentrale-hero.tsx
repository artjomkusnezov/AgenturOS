import { AgenturzentraleOfficeScene } from '@/features/dashboard/components/agenturzentrale-office-scene'
import { getDailyQuote } from '@/features/dashboard/lib/dashboard-daily-quote'
import {
  getFirstNameFromUser,
  getTimeOfDayGreeting,
  getWorkSituationHint,
} from '@/features/dashboard/lib/dashboard-greeting'
import { getGermanDateLabel } from '@/lib/user/get-display-name'

type AgenturzentraleHeroProps = {
  user: {
    user_metadata?: Record<string, unknown>
  }
  unprocessedInboxCount: number
  attentionCount: number
  myOpenTaskCount: number
  teamOpenTaskCount: number
}

export function AgenturzentraleHero({
  user,
  unprocessedInboxCount,
  attentionCount,
  myOpenTaskCount,
  teamOpenTaskCount,
}: AgenturzentraleHeroProps) {
  const greeting = getTimeOfDayGreeting()
  const firstName = getFirstNameFromUser(user)
  const situationHint = getWorkSituationHint({
    unprocessedInboxCount,
    attentionCount,
    myOpenTaskCount,
    teamOpenTaskCount,
  })
  const quote = getDailyQuote()

  return (
    <section
      aria-labelledby="agenturzentrale-greeting"
      className="az-hero-scene relative min-h-[12rem] sm:min-h-[14rem] lg:min-h-[17rem] xl:min-h-[19rem]"
    >
      <AgenturzentraleOfficeScene />
      <div className="az-hero-window-glow" aria-hidden="true" />
      <div className="az-hero-desk-line" aria-hidden="true" />
      <div className="az-hero-vignette" aria-hidden="true" />

      <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-end p-5 sm:p-6 lg:p-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400/90">
          {getGermanDateLabel()} · Agenturzentrale
        </p>

        <h1
          id="agenturzentrale-greeting"
          className="mt-1 max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-[2rem] lg:leading-tight"
        >
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>

        <p
          className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-300/90 sm:text-sm"
          aria-live="polite"
        >
          {situationHint}
        </p>

        <blockquote className="mt-4 max-w-2xl border-l-2 border-amber-400/50 pl-4 sm:mt-5">
          <p className="text-sm italic leading-relaxed text-zinc-200/95 sm:text-[0.9375rem]">
            „{quote.text}“
          </p>
          <footer className="mt-1.5 text-[11px] font-medium text-amber-300/80">
            — {quote.author}
          </footer>
        </blockquote>
      </div>
    </section>
  )
}
