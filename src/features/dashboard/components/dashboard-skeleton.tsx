import { dashboardSurfaceClassName } from '@/features/dashboard/lib/dashboard-surface'

export function DashboardSkeleton() {
  return (
    <div
      className="animate-pulse space-y-5"
      aria-busy="true"
      aria-label="Dashboard wird geladen"
    >
      <section className="aos-dashboard-hero" aria-hidden="true">
        <div className="aos-dashboard-hero-stage">
          <div className="aos-dashboard-hero-glow" />
          <div className="aos-dashboard-hero-window" />
          <div className="aos-dashboard-hero-blinds" />
          <div className="aos-dashboard-hero-floor" />
          <div className="aos-dashboard-hero-desk" />
        </div>
        <div className="aos-dashboard-hero-content space-y-2">
          <div className="h-3 w-36 rounded bg-white/10" />
          <div className="h-8 w-64 max-w-full rounded bg-white/15" />
          <div className="h-3 w-full max-w-md rounded bg-white/10" />
          <div className="mt-3 h-4 w-56 max-w-full rounded bg-white/10" />
        </div>
      </section>

      <section aria-hidden="true" className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className={`${dashboardSurfaceClassName} p-4`}>
            <div className="mb-3 h-4 w-32 rounded bg-zinc-200/80" />
            <div className="space-y-2.5">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-9 rounded-lg bg-zinc-100/80" />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
