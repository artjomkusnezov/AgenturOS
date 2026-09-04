import Image from 'next/image'

import type { DashboardDailyQuote } from '@/features/dashboard/lib/dashboard-daily-quote'

type DashboardGreetingProps = {
  dateLabel: string
  greetingTitle: string
  dailyQuote: DashboardDailyQuote
}

/** Legacy hero wrapper — Agenturzentrale uses AgenturzentraleDashboard Hero. */
export function DashboardGreeting({
  dateLabel,
  greetingTitle,
  dailyQuote,
}: DashboardGreetingProps) {
  return (
    <header className="aos-dashboard-hero" aria-labelledby="dashboard-hero-heading">
      <div className="aos-dashboard-hero-stage" aria-hidden="true">
        <Image
          src="/hero-agenturzentrale.jpg"
          alt=""
          width={1920}
          height={1080}
          priority
          unoptimized
          className="aos-dashboard-hero-image"
        />
        <div className="aos-dashboard-hero-overlay" />
      </div>

      <div className="aos-dashboard-hero-content">
        <p className="aos-dashboard-hero-date">{dateLabel}</p>
        <h1 id="dashboard-hero-heading" className="aos-dashboard-hero-title">
          {greetingTitle}
        </h1>
        <blockquote className="az-hero-quote-block">
          <p className="az-hero-quote">
            <span className="az-hero-quote-mark" aria-hidden="true">
              “
            </span>
            {dailyQuote.text}
          </p>
          <footer className="az-hero-quote-author">— {dailyQuote.author}</footer>
        </blockquote>
      </div>
    </header>
  )
}
