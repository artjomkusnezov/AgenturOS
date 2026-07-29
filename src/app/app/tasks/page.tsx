import { TasksWorkspace } from '@/features/tasks/components/tasks-workspace'
import { listTasksForCurrentUser } from '@/features/tasks/repositories/tasks-repository'

export default async function TasksPage() {
  const result = await listTasksForCurrentUser()

  if (!result.success) {
    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50 px-5 py-4 text-sm text-red-700">
        {result.error}
      </div>
    )
  }

  return (
    <TasksWorkspace
      openTasks={result.openTasks}
      completedTasks={result.completedTasks}
    />
  )
}
