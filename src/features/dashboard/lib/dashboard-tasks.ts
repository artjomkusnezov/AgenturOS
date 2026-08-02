import { mapCaseRecordToTask } from '@/features/cases/lib/map-case-to-task'
import {
  resolveCaseTypeKey,
  type CaseTypeLookup,
} from '@/features/cases/lib/case-display'
import type { CaseRecord } from '@/features/cases/types/case'
import type { AgencyMember } from '@/features/agency/types/agency-member'
import {
  formatDueDateLabel,
  getTodayDateString,
  isTaskOpen,
  isTaskOverdue,
} from '@/features/tasks/lib/task-status'
import type { TaskPriority } from '@/features/tasks/types/task'

export type DashboardTaskItem = {
  taskId: string
  title: string
  href: string
  dueDate: string | null
  dueLabel: string | null
  priority: TaskPriority
  isOverdue: boolean
  isDueToday: boolean
  updatedAt: string
  assigneeUserId: string | null
}

export type DashboardTeamMemberTasks = {
  userId: string
  displayName: string
  openCount: number
  overdueCount: number
  previewTasks: DashboardTaskItem[]
}

export type DashboardTeamTasksResult = {
  members: DashboardTeamMemberTasks[]
  unassigned: {
    openCount: number
    overdueCount: number
    previewTasks: DashboardTaskItem[]
  }
  totalTeamOpenCount: number
}

function taskPriorityScore(task: DashboardTaskItem): number {
  if (task.isOverdue) {
    return 0
  }
  if (task.isDueToday) {
    return 1
  }
  if (task.dueDate) {
    return 2
  }
  if (task.priority === 'high') {
    return 3
  }
  return 4
}

function compareDashboardTasks(a: DashboardTaskItem, b: DashboardTaskItem): number {
  const scoreDiff = taskPriorityScore(a) - taskPriorityScore(b)
  if (scoreDiff !== 0) {
    return scoreDiff
  }

  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
    return a.dueDate.localeCompare(b.dueDate)
  }

  if (a.dueDate && !b.dueDate) {
    return -1
  }

  if (!a.dueDate && b.dueDate) {
    return 1
  }

  return b.updatedAt.localeCompare(a.updatedAt)
}

export function buildOpenTaskItemsFromCases(
  openCases: CaseRecord[],
  caseTypesById: Record<string, CaseTypeLookup>,
  today = getTodayDateString(),
): DashboardTaskItem[] {
  const items: DashboardTaskItem[] = []

  for (const caseRow of openCases) {
    if (resolveCaseTypeKey(caseRow.case_type_id, caseTypesById) !== 'task') {
      continue
    }

    if (!caseRow.source_task_id) {
      continue
    }

    const task = mapCaseRecordToTask(caseRow)
    if (!isTaskOpen(task)) {
      continue
    }

    items.push({
      taskId: task.id,
      title: task.title.trim() || 'Aufgabe',
      href: `/app/tasks?task=${task.id}`,
      dueDate: task.due_date,
      dueLabel: task.due_date
        ? formatDueDateLabel(task.due_date, today, true)
        : null,
      priority: task.priority,
      isOverdue: isTaskOverdue(task, today),
      isDueToday: task.due_date === today,
      updatedAt: task.updated_at,
      assigneeUserId: task.assignee_user_id,
    })
  }

  return items
}

export function selectMyTasksForDashboard(
  tasks: DashboardTaskItem[],
  currentUserId: string,
  limit = 5,
): DashboardTaskItem[] {
  return tasks
    .filter((task) => task.assigneeUserId === currentUserId)
    .sort(compareDashboardTasks)
    .slice(0, limit)
}

export function countMyOpenTasks(
  tasks: DashboardTaskItem[],
  currentUserId: string,
): number {
  return tasks.filter((task) => task.assigneeUserId === currentUserId).length
}

export function selectTeamTasksForDashboard(
  tasks: DashboardTaskItem[],
  members: AgencyMember[],
  currentUserId: string,
  previewLimit = 3,
): DashboardTeamTasksResult {
  const otherMembers = members.filter((member) => member.userId !== currentUserId)
  const memberGroups: DashboardTeamMemberTasks[] = []

  for (const member of otherMembers) {
    const memberTasks = tasks
      .filter((task) => task.assigneeUserId === member.userId)
      .sort(compareDashboardTasks)

    if (memberTasks.length === 0) {
      continue
    }

    memberGroups.push({
      userId: member.userId,
      displayName: member.displayName,
      openCount: memberTasks.length,
      overdueCount: memberTasks.filter((task) => task.isOverdue).length,
      previewTasks: memberTasks.slice(0, previewLimit),
    })
  }

  memberGroups.sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'))

  const unassignedTasks = tasks
    .filter((task) => task.assigneeUserId === null)
    .sort(compareDashboardTasks)

  const totalTeamOpenCount =
    memberGroups.reduce((sum, group) => sum + group.openCount, 0) +
    unassignedTasks.length

  return {
    members: memberGroups,
    unassigned: {
      openCount: unassignedTasks.length,
      overdueCount: unassignedTasks.filter((task) => task.isOverdue).length,
      previewTasks: unassignedTasks.slice(0, previewLimit),
    },
    totalTeamOpenCount,
  }
}
