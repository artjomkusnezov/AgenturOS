import { CasesWorkspacePageContent } from '@/features/cases/components/cases-workspace-page-content'

type CasesPageProps = {
  searchParams: Promise<{
    view?: string
    task?: string
    taskId?: string
    case?: string
    file?: string
    attachments?: string
  }>
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const params = await searchParams

  return (
    <CasesWorkspacePageContent
      pathMode="cases"
      viewParam={params.view ?? null}
      taskParam={params.task ?? params.taskId ?? null}
      caseParam={params.case ?? null}
      fileParam={params.file ?? null}
      attachmentsParam={params.attachments ?? null}
    />
  )
}
