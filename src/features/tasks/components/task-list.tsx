import type { Task } from '@/features/tasks/types/task'

type TaskListProps = {
  tasks: Task[]
  selectedTaskId: string | null
  onSelectTask: (taskId: string) => void
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Heute'
  }

  if (diffDays === 1) {
    return 'Gestern'
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export function TaskList({ tasks, selectedTaskId, onSelectTask }: TaskListProps) {
  return (
    <ul className="flex flex-col gap-1">
      {tasks.map((task) => {
        const isSelected = task.id === selectedTaskId

        return (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onSelectTask(task.id)}
              aria-current={isSelected ? 'true' : undefined}
              className={`w-full rounded-xl px-3 py-3 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                isSelected
                  ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80'
                  : 'text-zinc-700 hover:bg-white/70 hover:text-zinc-900'
              }`}
            >
              <p className="truncate text-sm font-medium">{task.title}</p>
              {task.description ? (
                <p className="mt-1 truncate text-xs text-zinc-500">{task.description}</p>
              ) : null}
              <p className="mt-2 text-xs text-zinc-400">
                {formatRelativeTime(task.updated_at)}
              </p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
