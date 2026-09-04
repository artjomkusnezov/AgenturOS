'use client'

import { useMemo, useState } from 'react'

import { TaskListItem } from '@/features/tasks/components/task-list-item'
import type { Task } from '@/features/tasks/types/task'
import { aosListGroupLabelClassName } from '@/lib/design-system'

const COMPLETED_PREVIEW_LIMIT = 5

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
  const [completedExpanded, setCompletedExpanded] = useState(false)

  const visibleCompletedTasks = useMemo(() => {
    if (completedExpanded || completedTasks.length <= COMPLETED_PREVIEW_LIMIT) {
      return completedTasks
    }

    return completedTasks.slice(0, COMPLETED_PREVIEW_LIMIT)
  }, [completedExpanded, completedTasks])

  const canToggleCompleted = completedTasks.length > COMPLETED_PREVIEW_LIMIT

  return (
    <div className="space-y-3">
      <div>
        <h3 className={aosListGroupLabelClassName}>Offen</h3>
        {openTasks.length === 0 ? (
          <p className="aos-ws-text-muted px-2 py-1.5 text-[11px]">Keine offenen Vorgänge.</p>
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
            {visibleCompletedTasks.map((task) => (
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
          {canToggleCompleted ? (
            <button
              type="button"
              className="aos-ws-archive-toggle"
              onClick={() => setCompletedExpanded((open) => !open)}
              aria-expanded={completedExpanded}
            >
              {completedExpanded ? 'Erledigte einklappen' : 'Alle erledigten anzeigen'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
