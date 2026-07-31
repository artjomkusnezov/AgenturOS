import { listCurrentAgencyMembers } from '@/features/agency/repositories/agency-repository'
import { TasksWorkspace } from '@/features/tasks/components/tasks-workspace'
import type { TaskDetailLoadState } from '@/features/tasks/types/task-detail'
import { buildMemberNameMap } from '@/features/tasks/lib/resolve-task-member-name'
import { isValidTaskId } from '@/features/tasks/lib/validate-task'
import { listTimelineForTask } from '@/features/tasks/repositories/task-timeline-repository'
import {
  getTaskById,
  listTasksForCurrentUser,
} from '@/features/tasks/repositories/tasks-repository'

type TasksPageProps = {
  searchParams: Promise<{ task?: string; taskId?: string }>
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const { task, taskId } = await searchParams
  const selectedTaskParam = task ?? taskId ?? null

  const [tasksResult, membersResult] = await Promise.all([
    listTasksForCurrentUser(),
    listCurrentAgencyMembers(),
  ])

  if (!tasksResult.success) {
    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50 px-5 py-4 text-sm text-red-700">
        {tasksResult.error}
      </div>
    )
  }

  const memberNameMap = membersResult.success
    ? buildMemberNameMap(membersResult.members)
    : {}

  let detailState: TaskDetailLoadState = { status: 'none' }
  let selectedTaskId: string | null = null

  if (selectedTaskParam) {
    if (!isValidTaskId(selectedTaskParam)) {
      detailState = { status: 'invalid' }
    } else {
      selectedTaskId = selectedTaskParam

      const taskResult = await getTaskById(selectedTaskParam)

      if (!taskResult.success) {
        detailState =
          taskResult.error === 'Die Aufgabe wurde nicht gefunden.'
            ? { status: 'not_found' }
            : {
                status: 'error',
                message: 'Der Vorgang konnte nicht geladen werden.',
              }
      } else {
        const timelineResult = await listTimelineForTask(selectedTaskParam)

        if (!timelineResult.success) {
          detailState = {
            status: 'error',
            message: 'Die Arbeitschronik konnte nicht geladen werden.',
          }
        } else {
          detailState = {
            status: 'ready',
            task: taskResult.task,
            timelineEntries: timelineResult.entries,
          }
        }
      }
    }
  }

  return (
    <TasksWorkspace
      openTasks={tasksResult.openTasks}
      completedTasks={tasksResult.completedTasks}
      selectedTaskId={selectedTaskId}
      memberNameMap={memberNameMap}
      detailState={detailState}
    />
  )
}
