import { dashboardSurfaceClassName } from '@/features/dashboard/lib/dashboard-surface'

export function DashboardSkeleton() {
  return (
    <div
      className="animate-pulse space-y-5"
      aria-busy="true"
      aria-label="Dashboard wird geladen"
    >
      <section className="space-y-1">
        <div className="h-3 w-28 rounded bg-zinc-200/70" />
        <div className="h-7 w-56 max-w-full rounded bg-zinc-200/80" />
        <div className="h-4 w-full max-w-lg rounded bg-zinc-200/50" />
      </section>

      <section
        aria-hidden="true"
        className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4 lg:gap-3.5"
      >
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`${dashboardSurfaceClassName} flex items-start gap-3 px-4 py-3.5 sm:px-5`}
          >
            <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-100" />
            <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
              <div className="h-7 w-10 rounded bg-zinc-200/80" />
              <div className="h-3 w-16 rounded bg-zinc-200/60" />
              <div className="h-3 w-24 rounded bg-zinc-100" />
            </div>
          </div>
        ))}
      </section>

      <section aria-hidden="true" className="grid items-start gap-4 xl:grid-cols-12">
        <div className={`${dashboardSurfaceClassName} p-4 xl:col-span-6`}>
          <div className="mb-3 h-4 w-32 rounded bg-zinc-200/80" />
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex gap-3">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-zinc-100" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-zinc-100" />
                  <div className="h-3 w-1/2 rounded bg-zinc-100/80" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={`${dashboardSurfaceClassName} p-4 xl:col-span-3`}>
          <div className="mb-3 h-4 w-28 rounded bg-zinc-200/80" />
          <div className="space-y-2">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-9 rounded-xl bg-zinc-100/80" />
            ))}
          </div>
        </div>
        <div className={`${dashboardSurfaceClassName} p-4 xl:col-span-3`}>
          <div className="mb-3 h-4 w-36 rounded bg-zinc-200/80" />
          <div className="space-y-2">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-10 rounded-xl bg-zinc-100/80" />
            ))}
          </div>
        </div>
      </section>

      <section aria-hidden="true" className="grid items-start gap-4 lg:grid-cols-2">
        <div className={`${dashboardSurfaceClassName} p-4`}>
          <div className="mb-3 h-4 w-28 rounded bg-zinc-200/80" />
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-zinc-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-28 rounded bg-zinc-200/70" />
              <div className="h-3 w-full rounded bg-zinc-100" />
              <div className="h-1.5 w-full rounded-full bg-zinc-100" />
            </div>
          </div>
        </div>
        <div className={`${dashboardSurfaceClassName} p-4`}>
          <div className="mb-3 h-4 w-28 rounded bg-zinc-200/80" />
          <div className="space-y-2.5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="space-y-1.5">
                <div className="h-3 w-14 rounded bg-zinc-100" />
                <div className="h-3.5 w-full rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
