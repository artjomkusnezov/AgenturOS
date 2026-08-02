export type CasesWorkspacePathMode = 'cases' | 'tasks'

export function buildCasesListHref(
  pathMode: CasesWorkspacePathMode,
  viewKey: string,
): string {
  if (pathMode === 'tasks') {
    return '/app/tasks'
  }

  return `/app/cases?view=${encodeURIComponent(viewKey)}`
}

export function buildCasesItemHref(
  pathMode: CasesWorkspacePathMode,
  viewKey: string,
  options: { taskId?: string; caseId?: string; fileId?: string } = {},
): string {
  const params = new URLSearchParams()

  if (pathMode === 'cases') {
    params.set('view', viewKey)
  }

  if (options.taskId) {
    params.set('task', options.taskId)
  }

  if (options.caseId) {
    params.set('case', options.caseId)
  }

  if (options.fileId) {
    params.set('file', options.fileId)
  }

  const query = params.toString()
  const base = pathMode === 'tasks' ? '/app/tasks' : '/app/cases'
  return query ? `${base}?${query}` : base
}

export const DEFAULT_CASES_VIEW_KEY = 'tasks'
