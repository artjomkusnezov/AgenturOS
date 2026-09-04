export function DashboardSkeleton() {
  return (
    <div
      className="az-shell az-skeleton animate-pulse"
      aria-busy="true"
      aria-label="Dashboard wird geladen"
    >
      <div className="az-frame">
        <div className="az-primary">
          <div className="az-hero" aria-hidden="true">
            <div className="az-hero-copy space-y-2">
              <div className="h-3 w-36 rounded bg-white/10" />
              <div className="h-6 w-56 max-w-full rounded bg-white/12" />
              <div className="h-3 w-full max-w-sm rounded bg-white/8" />
            </div>
          </div>

          <div className="az-lage" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="az-lage-card">
                <div className="h-9 w-9 rounded-lg bg-white/8" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-2.5 w-16 rounded bg-white/8" />
                  <div className="h-6 w-10 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>

          <div className="az-workbench" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="az-panel">
                <div className="mb-3 h-3.5 w-28 rounded bg-white/10" />
                <div className="space-y-2">
                  {[0, 1, 2].map((r) => (
                    <div key={r} className="h-9 max-w-xs rounded-lg bg-white/6" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="az-rail" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="az-rail-card">
              <div className="mb-2 h-3 w-24 rounded bg-white/10" />
              <div className="h-8 rounded-lg bg-white/6" />
            </div>
          ))}
        </aside>
      </div>
    </div>
  )
}
