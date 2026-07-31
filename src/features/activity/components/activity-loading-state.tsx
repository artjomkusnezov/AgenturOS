export function ActivityLoadingState() {
  return (
    <div
      className="mx-auto w-full max-w-3xl animate-pulse space-y-5"
      aria-busy="true"
      aria-label="Aktivitäten werden geladen"
    >
      <section className="space-y-1.5">
        <div className="h-8 w-36 rounded bg-zinc-200/80" />
        <div className="h-4 w-72 max-w-full rounded bg-zinc-200/60" />
      </section>

      <section className="rounded-xl border border-zinc-200/60 bg-white px-4 py-4 sm:px-5">
        <div className="divide-y divide-zinc-200/70">
          <div className="py-4 first:pt-0">
            <div className="mb-3 h-3 w-16 rounded bg-zinc-200/60" />
            <div className="space-y-4">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="flex gap-3 border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="mt-0.5 h-4 w-4 shrink-0 rounded bg-zinc-200/70" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-full max-w-md rounded bg-zinc-200/80" />
                    <div className="h-3 w-28 rounded bg-zinc-200/60" />
                    <div className="h-4 w-40 max-w-full rounded bg-zinc-200/70" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
