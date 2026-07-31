'use client'

type TaskFilePreviewErrorProps = {
  message: string
  onClose: () => void
  onRetry?: () => void
}

export function TaskFilePreviewError({
  message,
  onClose,
  onRetry,
}: TaskFilePreviewErrorProps) {
  return (
    <div className="flex h-full min-h-[24rem] flex-col rounded-xl border border-zinc-200/60 bg-white lg:min-h-0">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200/70 px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center text-sm font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-900"
        >
          ← Zurück zum Vorgang
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-10 text-center">
        <p className="max-w-md text-sm text-zinc-600">{message}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl border border-zinc-200/80 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50"
            >
              Erneut laden
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}
