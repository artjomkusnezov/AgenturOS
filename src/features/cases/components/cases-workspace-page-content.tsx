import { listCurrentAgencyMembers } from '@/features/agency/repositories/agency-repository'
import {
  buildCasesItemHref,
  buildCasesListHref,
  DEFAULT_CASES_VIEW_KEY,
  type CasesWorkspacePathMode,
} from '@/features/cases/lib/cases-workspace-urls'
import { mapCaseRecordToTask } from '@/features/cases/lib/map-case-to-task'
import { listCasesForWorkspaceViewFilters } from '@/features/cases/repositories/list-cases-for-workspace-view'
import {
  getTaskCaseBySourceTaskIdAsTask,
} from '@/features/cases/repositories/cases-repository'
import { CasesWorkspace } from '@/features/cases/components/cases-workspace'
import { parseTaskAttachmentNotice } from '@/features/capture/lib/task-capture-notice'
import { listFilesForCurrentUser } from '@/features/files/repositories/files-repository'
import { isValidFileId } from '@/features/files/lib/validate-file'
import { listInformationItemsForCurrentUser } from '@/features/information/repositories/information-repository'
import { TasksWorkspace } from '@/features/tasks/components/tasks-workspace'
import { loadTaskFilePreview } from '@/features/tasks/lib/load-task-file-preview'
import { buildMemberNameMap } from '@/features/tasks/lib/resolve-task-member-name'
import { isValidTaskId } from '@/features/tasks/lib/validate-task'
import {
  listFilesForTask,
  listInformationForTask,
} from '@/features/tasks/repositories/task-relations-repository'
import { enrichTaskLinkedFilesWithMediaUrls } from '@/features/tasks/lib/enrich-task-linked-files'
import { listTimelineForTask } from '@/features/tasks/repositories/task-timeline-repository'
import type { TaskDetailLoadState } from '@/features/tasks/types/task-detail'
import type { TaskFilePreviewLoadState } from '@/features/tasks/types/task-file-preview'
import { getWorkspaceViewEmptyMessage } from '@/features/workspace-views/lib/workspace-view-icons'
import {
  getWorkspaceViewByKeyForCurrentAgency,
  listActiveWorkspaceViews,
} from '@/features/workspace-views/repositories/workspace-views-repository'
import { aosAlertErrorClassName } from '@/lib/design-system'

type CasesWorkspacePageContentProps = {
  pathMode: CasesWorkspacePathMode
  viewParam?: string | null
  taskParam?: string | null
  caseParam?: string | null
  fileParam?: string | null
  attachmentsParam?: string | null
}

function isTaskOrientedView(viewKey: string, caseTypeKeys: string[] | undefined): boolean {
  if (viewKey === 'tasks') {
    return true
  }

  return Boolean(
    caseTypeKeys
    && caseTypeKeys.length === 1
    && caseTypeKeys[0] === 'task',
  )
}

export async function CasesWorkspacePageContent({
  pathMode,
  viewParam = null,
  taskParam = null,
  caseParam = null,
  fileParam = null,
  attachmentsParam = null,
}: CasesWorkspacePageContentProps) {
  const viewsResult = await listActiveWorkspaceViews()

  if (!viewsResult.success) {
    return (
      <div className={`${aosAlertErrorClassName} px-5 py-4`}>
        {viewsResult.error}
      </div>
    )
  }

  const requestedViewKey =
    pathMode === 'tasks'
      ? DEFAULT_CASES_VIEW_KEY
      : (viewParam?.trim() || DEFAULT_CASES_VIEW_KEY)

  let activeView =
    viewsResult.views.find((view) => view.key === requestedViewKey) ?? null

  if (!activeView) {
    const fallbackResult = await getWorkspaceViewByKeyForCurrentAgency(DEFAULT_CASES_VIEW_KEY)
    if (fallbackResult.success) {
      activeView = fallbackResult.view
    } else {
      activeView = viewsResult.views[0] ?? null
    }
  }

  if (!activeView) {
    return (
      <div className={`${aosAlertErrorClassName} px-5 py-4`}>
        Es sind keine aktiven Arbeitsansichten vorhanden.
      </div>
    )
  }

  const useTaskWorkspace = isTaskOrientedView(
    activeView.key,
    activeView.filters.case_type_keys,
  )

  const listHref = buildCasesListHref(pathMode, activeView.key)
  const buildTaskHref = (taskId: string) =>
    buildCasesItemHref(pathMode, activeView.key, { taskId })

  if (useTaskWorkspace) {
    const [
      openCasesResult,
      completedCasesResult,
      membersResult,
      allFilesResult,
      allInformationResult,
    ] = await Promise.all([
      listCasesForWorkspaceViewFilters({
        filters: activeView.filters,
        sort: activeView.sort,
      }),
      listCasesForWorkspaceViewFilters({
        filters: {
          case_type_keys: ['task'],
          core_statuses: ['completed'],
        },
        sort: activeView.sort,
      }),
      listCurrentAgencyMembers(),
      listFilesForCurrentUser(),
      listInformationItemsForCurrentUser(),
    ])

    if (!openCasesResult.success) {
      return (
        <div className={`${aosAlertErrorClassName} px-5 py-4`}>
          {openCasesResult.error}
        </div>
      )
    }

    if (!completedCasesResult.success) {
      return (
        <div className={`${aosAlertErrorClassName} px-5 py-4`}>
          {completedCasesResult.error}
        </div>
      )
    }

    const openTasks = openCasesResult.cases
      .filter((row) => row.source_task_id)
      .map((row) => mapCaseRecordToTask(row))
    const completedTasks = completedCasesResult.cases
      .filter((row) => row.source_task_id)
      .map((row) => mapCaseRecordToTask(row))

    const memberNameMap = membersResult.success
      ? buildMemberNameMap(membersResult.members)
      : {}
    const agencyMembers = membersResult.success ? membersResult.members : []
    const allFiles = allFilesResult.success ? allFilesResult.files : []
    const allInformation = allInformationResult.success ? allInformationResult.items : []

    let detailState: TaskDetailLoadState = { status: 'none' }
    let selectedTaskId: string | null = null
    let filePreviewState: TaskFilePreviewLoadState = { status: 'none' }
    let selectedFileId: string | null = null
    const selectedTaskParam = taskParam

    if (fileParam && !selectedTaskParam) {
      filePreviewState = { status: 'no_task' }
    } else if (fileParam && !isValidFileId(fileParam)) {
      filePreviewState = { status: 'invalid' }
      selectedFileId = fileParam
    } else if (fileParam) {
      selectedFileId = fileParam
    }

    if (selectedTaskParam) {
      if (!isValidTaskId(selectedTaskParam)) {
        detailState = { status: 'invalid' }
      } else {
        selectedTaskId = selectedTaskParam
        const taskResult = await getTaskCaseBySourceTaskIdAsTask(selectedTaskParam)

        if (!taskResult.success) {
          detailState =
            taskResult.error === 'Die Aufgabe wurde nicht gefunden.'
              ? { status: 'not_found' }
              : {
                  status: 'error',
                  message: 'Der Vorgang konnte nicht geladen werden.',
                }
        } else {
          const [timelineResult, linkedFilesResult, linkedInformationResult] =
            await Promise.all([
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
              linkedFiles: await enrichTaskLinkedFilesWithMediaUrls(
                selectedTaskParam,
                linkedFilesResult.files,
              ),
              linkedInformation: linkedInformationResult.information,
              availableFiles: allFiles.filter((file) => !linkedFileIds.has(file.id)),
              availableInformation: allInformation.filter(
                (item) => !linkedInformationIds.has(item.id),
              ),
            }

            if (selectedFileId) {
              filePreviewState = await loadTaskFilePreview(
                selectedTaskParam,
                selectedFileId,
              )
            }
          }
        }
      }
    }

    const taskAttachmentNotice = parseTaskAttachmentNotice(
      selectedTaskId,
      attachmentsParam ?? undefined,
    )

    return (
      <TasksWorkspace
        openTasks={openTasks}
        completedTasks={completedTasks}
        selectedTaskId={selectedTaskId}
        selectedFileId={selectedFileId}
        memberNameMap={memberNameMap}
        agencyMembers={agencyMembers}
        detailState={detailState}
        filePreviewState={filePreviewState}
        taskAttachmentNotice={taskAttachmentNotice}
        listHref={listHref}
        buildTaskHref={buildTaskHref}
        emptyTitle={getWorkspaceViewEmptyMessage(activeView.key, activeView.name)}
        emptyDescription="Neue Vorgänge erscheinen hier, sobald sie erfasst wurden."
        allowCreate={activeView.key === 'tasks'}
      />
    )
  }

  const [casesResult, membersResult] = await Promise.all([
    listCasesForWorkspaceViewFilters({
      filters: activeView.filters,
      sort: activeView.sort,
    }),
    listCurrentAgencyMembers(),
  ])

  if (!casesResult.success) {
    return (
      <div className={`${aosAlertErrorClassName} px-5 py-4`}>
        {casesResult.error}
      </div>
    )
  }

  const memberNameMap = membersResult.success
    ? buildMemberNameMap(membersResult.members)
    : {}

  return (
    <CasesWorkspace
      view={activeView}
      cases={casesResult.cases}
      selectedCaseId={caseParam}
      memberNameMap={memberNameMap}
      pathMode={pathMode}
      emptyMessage={getWorkspaceViewEmptyMessage(activeView.key, activeView.name)}
    />
  )
}
