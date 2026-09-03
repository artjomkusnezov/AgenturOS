type DashboardGreetingProps = {
  dateLabel: string
  greetingTitle: string
  situationHint: string
  dailyQuote: string
}

export function DashboardGreeting({
  dateLabel,
  greetingTitle,
  situationHint,
  dailyQuote,
}: DashboardGreetingProps) {
  return (
    <header className="aos-dashboard-hero" aria-labelledby="dashboard-hero-heading">
      <div className="aos-dashboard-hero-stage" aria-hidden="true">
        <div className="aos-dashboard-hero-glow" />
        <div className="aos-dashboard-hero-window" />
        <div className="aos-dashboard-hero-blinds" />
        <div className="aos-dashboard-hero-floor" />
        <div className="aos-dashboard-hero-desk" />
      </div>

      <div className="aos-dashboard-hero-content">
        <p className="aos-dashboard-hero-date">{dateLabel}</p>
        <h1 id="dashboard-hero-heading" className="aos-dashboard-hero-title">
          {greetingTitle}
        </h1>
        <p className="aos-dashboard-hero-hint" aria-live="polite">
          {situationHint}
        </p>
        <p className="aos-dashboard-hero-quote">{dailyQuote}</p>
      </div>
    </header>
  )
}
