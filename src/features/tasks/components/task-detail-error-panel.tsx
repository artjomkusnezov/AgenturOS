import { aosPanelHeaderClassName, aosWorkspaceSurfaceClassName } from '@/lib/design-system'

type TaskDetailErrorPanelProps = {
  message: string
  onBack?: () => void
}

export function TaskDetailErrorPanel({
  message,
  onBack,
}: TaskDetailErrorPanelProps) {
  return (
    <div className={`${aosWorkspaceSurfaceClassName} min-h-[12rem]`}>
      {onBack ? (
        <div className={`${aosPanelHeaderClassName} lg:hidden`}>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center text-xs font-medium text-zinc-400 transition-colors duration-150 hover:text-zinc-800"
          >
            ← Liste
          </button>
        </div>
      ) : null}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <p className="max-w-sm text-center text-sm text-zinc-500">{message}</p>
      </div>
    </div>
  )
}
