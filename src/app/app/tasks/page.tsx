import { listCurrentAgencyMembers } from '@/features/agency/repositories/agency-repository'
import { listFilesForCurrentUser } from '@/features/files/repositories/files-repository'
import { listInformationItemsForCurrentUser } from '@/features/information/repositories/information-repository'
import { TasksWorkspace } from '@/features/tasks/components/tasks-workspace'
import type { TaskDetailLoadState } from '@/features/tasks/types/task-detail'
import { buildMemberNameMap } from '@/features/tasks/lib/resolve-task-member-name'
import { isValidTaskId } from '@/features/tasks/lib/validate-task'
import {
  listFilesForTask,
  listInformationForTask,
} from '@/features/tasks/repositories/task-relations-repository'
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

  const [tasksResult, membersResult, allFilesResult, allInformationResult] = await Promise.all([
    listTasksForCurrentUser(),
    listCurrentAgencyMembers(),
    listFilesForCurrentUser(),
    listInformationItemsForCurrentUser(),
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

  const allFiles = allFilesResult.success ? allFilesResult.files : []
  const allInformation = allInformationResult.success ? allInformationResult.items : []

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
        const [timelineResult, linkedFilesResult, linkedInformationResult] = await Promise.all([
          listTimelineForTask(selectedTaskParam),
          listFilesForTask(selectedTaskParam),
          listInformationForTask(selectedTaskParam),
        ])

        if (!timelineResult.success) {
          detailState = {
            status: 'error',
            message: 'Die Arbeitschronik konnte nicht geladen werden.',
          }
        } else if (!linkedFilesResult.success) {
          detailState = {
            status: 'error',
            message: 'Die verknüpften Dateien konnten nicht geladen werden.',
          }
        } else if (!linkedInformationResult.success) {
          detailState = {
            status: 'error',
            message: 'Die verknüpften Informationen konnten nicht geladen werden.',
          }
        } else {
          const linkedFileIds = new Set(
            linkedFilesResult.files.map((entry) => entry.file.id),
          )
          const linkedInformationIds = new Set(
            linkedInformationResult.information.map((entry) => entry.information.id),
          )

          detailState = {
            status: 'ready',
            task: taskResult.task,
            timelineEntries: timelineResult.entries,
            linkedFiles: linkedFilesResult.files,
            linkedInformation: linkedInformationResult.information,
            availableFiles: allFiles.filter((file) => !linkedFileIds.has(file.id)),
            availableInformation: allInformation.filter(
              (item) => !linkedInformationIds.has(item.id),
            ),
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
