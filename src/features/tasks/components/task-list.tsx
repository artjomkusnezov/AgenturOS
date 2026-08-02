'use client'

import { TaskListItem } from '@/features/tasks/components/task-list-item'
import type { Task } from '@/features/tasks/types/task'
import { aosListGroupLabelClassName } from '@/lib/design-system'

type TaskListProps = {
  openTasks: Task[]
  completedTasks: Task[]
  selectedTaskId: string | null
  memberNameMap: Record<string, string>
  onSelectTask: (taskId: string) => void
}

export function TaskList({
  openTasks,
  completedTasks,
  selectedTaskId,
  memberNameMap,
  onSelectTask,
}: TaskListProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className={aosListGroupLabelClassName}>Offen</h3>
        {openTasks.length === 0 ? (
          <p className="px-2 py-1.5 text-[11px] text-zinc-400">Keine offenen Aufgaben.</p>
        ) : (
          <ul className="flex flex-col">
            {openTasks.map((task) => (
              <li key={task.id}>
                <TaskListItem
                  task={task}
                  isSelected={task.id === selectedTaskId}
                  memberNameMap={memberNameMap}
                  onSelect={onSelectTask}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {completedTasks.length > 0 ? (
        <div className="border-t border-zinc-200/40 pt-2.5">
          <h3 className={aosListGroupLabelClassName}>Erledigt</h3>
          <ul className="flex flex-col">
            {completedTasks.map((task) => (
              <li key={task.id}>
                <TaskListItem
                  task={task}
                  isSelected={task.id === selectedTaskId}
                  subdued
                  memberNameMap={memberNameMap}
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
