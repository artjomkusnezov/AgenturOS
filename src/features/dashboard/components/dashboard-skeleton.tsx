export function DashboardSkeleton() {
  return (
    <div
      className="animate-pulse space-y-8"
      aria-busy="true"
      aria-label="Dashboard wird geladen"
    >
      <section className="space-y-3">
        <div className="h-3 w-28 rounded bg-zinc-200/80" />
        <div className="h-8 w-64 max-w-full rounded bg-zinc-200/80" />
        <div className="h-4 w-full max-w-xl rounded bg-zinc-200/60" />
      </section>

      <section aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="min-h-[9.5rem] rounded-xl border border-zinc-200/60 bg-white p-5"
          >
            <div className="h-4 w-20 rounded bg-zinc-200/80" />
            <div className="mt-4 h-8 w-12 rounded bg-zinc-200/80" />
            <div className="mt-3 h-3 w-32 rounded bg-zinc-200/60" />
            <div className="mt-6 h-3 w-20 rounded bg-zinc-200/60" />
          </div>
        ))}
      </section>

      <section
        aria-hidden="true"
        className="grid gap-6 md:grid-cols-2 xl:grid-cols-2"
      >
        {[0, 1].map((index) => (
          <div
            key={index}
            className="min-h-[16rem] rounded-xl border border-zinc-200/60 bg-white p-4"
          >
            <div className="mb-4 h-4 w-36 rounded bg-zinc-200/80" />
            <div className="space-y-3">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-12 rounded-lg bg-zinc-100/80" />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section aria-hidden="true" className="space-y-3">
        <div className="h-4 w-28 rounded bg-zinc-200/80" />
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-10 w-32 rounded-xl bg-zinc-200/70" />
          ))}
        </div>
      </section>
    </div>
  )
}
