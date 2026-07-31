type TaskDetailErrorPanelProps = {
  message: string
  onBack?: () => void
}

export function TaskDetailErrorPanel({
  message,
  onBack,
}: TaskDetailErrorPanelProps) {
  return (
    <div className="flex h-full min-h-[20rem] flex-col rounded-xl border border-zinc-200/60 bg-white">
      {onBack ? (
        <div className="border-b border-zinc-200/70 px-5 py-4 lg:hidden">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center text-sm font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-900"
          >
            ← Zurück zur Liste
          </button>
        </div>
      ) : null}
      <div className="flex flex-1 items-center justify-center px-5 py-8">
        <p className="max-w-sm text-center text-sm text-zinc-600">{message}</p>
      </div>
    </div>
  )
}
