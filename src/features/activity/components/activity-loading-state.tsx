export function ActivityLoadingState() {
  return (
    <div
      className="mx-auto w-full max-w-3xl animate-pulse space-y-6"
      aria-busy="true"
      aria-label="Aktivitäten werden geladen"
    >
      <section className="space-y-2">
        <div className="h-8 w-40 rounded bg-zinc-200/80" />
        <div className="h-4 w-72 max-w-full rounded bg-zinc-200/60" />
      </section>

      <section className="rounded-xl border border-zinc-200/60 bg-white px-4 py-4 sm:px-5">
        <div className="space-y-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="space-y-2 border-b border-zinc-100 pb-4 last:border-b-0">
              <div className="h-4 w-full max-w-md rounded bg-zinc-200/80" />
              <div className="h-3 w-32 rounded bg-zinc-200/60" />
              <div className="h-4 w-48 rounded bg-zinc-200/70" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
