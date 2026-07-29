'use client'

import { TaskListItem } from '@/features/tasks/components/task-list-item'
import type { Task } from '@/features/tasks/types/task'

type TaskListProps = {
  openTasks: Task[]
  completedTasks: Task[]
  selectedTaskId: string | null
  onSelectTask: (taskId: string) => void
}

export function TaskList({
  openTasks,
  completedTasks,
  selectedTaskId,
  onSelectTask,
}: TaskListProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Offen
        </h3>
        {openTasks.length === 0 ? (
          <p className="px-1 py-3 text-sm text-zinc-500">Keine offenen Aufgaben.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {openTasks.map((task) => (
              <li key={task.id}>
                <TaskListItem
                  task={task}
                  isSelected={task.id === selectedTaskId}
                  onSelect={onSelectTask}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {completedTasks.length > 0 ? (
        <div className="border-t border-zinc-200/70 pt-4">
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Erledigt
          </h3>
          <ul className="flex flex-col gap-1">
            {completedTasks.map((task) => (
              <li key={task.id}>
                <TaskListItem
                  task={task}
                  isSelected={task.id === selectedTaskId}
                  subdued
                  onSelect={onSelectTask}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
