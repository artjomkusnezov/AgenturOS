/**
 * Einheitlicher Writer für Vorgänge vom Typ `task` (Punkt 30D).
 *
 * Soft-Cutover-Strategie (Variante C + physischer Pfad B):
 * - Eine Anwendungsschreibquelle: dieser Service.
 * - Persistenz bleibt `tasks` → Mirror-Trigger → `cases`.
 * - Kein paralleler Case-Direct-Write (RLS: cases nur SELECT; Mirror aktiv).
 * - Öffentliche IDs bleiben Task-IDs (`source_task_id`) für URLs, Timeline, Dateien, Infos.
 *
 * Späterer Contract kann die Persistenz hinter dieser API auf Case-first umstellen,
 * ohne Actions/UI zu ändern.
 */

import { createTaskFromInboxItem } from '@/features/inbox/repositories/inbox-repository'
import {
  completeTaskForCurrentUser,
  createTaskForCurrentUser,
  deleteTaskForCurrentUser,
  reopenTaskForCurrentUser,
  updateTaskAssigneeForCurrentUser,
  updateTaskDetailsForCurrentUser,
} from '@/features/tasks/repositories/tasks-repository'
import type { Task, TaskPriority } from '@/features/tasks/types/task'

type RepositoryError = {
  success: false
  error: string
}

type TaskCaseResult = { success: true; task: Task } | RepositoryError

type DeleteTaskCaseResult = { success: true } | RepositoryError

type CreateTaskCaseFromInboxResult =
  | { success: true; inboxItemId: string; taskId: string; relationId: string }
  | RepositoryError

type TaskCaseWriteInput = {
  title: string
  description: string | null
}

type TaskCaseDetailWriteInput = {
  title: string
  description: string | null
  priority: TaskPriority
  due_date: string | null
}

export async function createTaskCaseForCurrentUser(
  input: TaskCaseWriteInput,
): Promise<TaskCaseResult> {
  return createTaskForCurrentUser(input)
}

export async function updateTaskCaseDetailsForCurrentUser(
  taskId: string,
  input: TaskCaseDetailWriteInput,
): Promise<TaskCaseResult> {
  return updateTaskDetailsForCurrentUser(taskId, input)
}

export async function completeTaskCaseForCurrentUser(
  taskId: string,
): Promise<TaskCaseResult> {
  return completeTaskForCurrentUser(taskId)
}

export async function reopenTaskCaseForCurrentUser(
  taskId: string,
): Promise<TaskCaseResult> {
  return reopenTaskForCurrentUser(taskId)
}

export async function updateTaskCaseAssigneeForCurrentUser(
  taskId: string,
  assigneeUserId: string | null,
): Promise<TaskCaseResult> {
  return updateTaskAssigneeForCurrentUser(taskId, assigneeUserId)
}

export async function deleteTaskCaseForCurrentUser(
  taskId: string,
): Promise<DeleteTaskCaseResult> {
  return deleteTaskForCurrentUser(taskId)
}

/**
 * Persistenz für Inbox→Task-Case. Öffentlicher Promotion-Einstieg: `promoteInboxItem`.
 */
export async function createTaskCaseFromInboxItem(
  itemId: string,
): Promise<CreateTaskCaseFromInboxResult> {
  return createTaskFromInboxItem(itemId)
}
