/**
 * Zentrale Abbildung des Task-Abschlusszustands auf cases.core_status.
 * Entspricht public.map_task_to_case_core_status in der Migration.
 */
export function mapTaskCompletedAtToCoreStatus(
  completedAt: string | null,
): 'open' | 'completed' {
  return completedAt === null ? 'open' : 'completed'
}
