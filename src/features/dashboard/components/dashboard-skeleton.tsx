import { azSurfaceClassName } from '@/features/dashboard/lib/agenturzentrale-surface'

export function DashboardSkeleton() {
  return (
    <div
      className="agenturzentrale-root animate-pulse space-y-4 lg:space-y-5"
      aria-busy="true"
      aria-label="Agenturzentrale wird geladen"
    >
      <div className={`az-hero-scene min-h-[11rem] sm:min-h-[13rem] lg:min-h-[15rem]`}>
        <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:p-6 lg:p-8">
          <div className="h-3 w-40 rounded bg-white/10" />
          <div className="mt-2 h-8 w-64 max-w-full rounded bg-white/15 sm:h-9" />
          <div className="mt-3 h-4 w-full max-w-lg rounded bg-white/10" />
          <div className="mt-5 h-12 w-full max-w-xl rounded bg-white/8" />
        </div>
      </div>

      <section aria-hidden="true" className="space-y-3">
        <div className="h-3 w-28 rounded bg-zinc-700/60" />
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`${azSurfaceClassName} flex min-h-[5.5rem] items-start gap-3 px-4 py-3.5`}
            >
              <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-700/50" />
              <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                <div className="h-7 w-10 rounded bg-zinc-600/50" />
                <div className="h-3 w-16 rounded bg-zinc-700/40" />
                <div className="h-3 w-24 rounded bg-zinc-700/30" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-hidden="true" className="grid gap-3 lg:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className={`${azSurfaceClassName} p-4`}>
            <div className="mb-3 h-4 w-36 rounded bg-zinc-700/50" />
            <div className="space-y-2.5">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-9 rounded-lg bg-zinc-700/30" />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
