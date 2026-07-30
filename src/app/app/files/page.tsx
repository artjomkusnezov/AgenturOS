import { FilesWorkspace } from '@/features/files/components/files-workspace'
import { isValidFileId } from '@/features/files/lib/validate-file'
import { listFilesForCurrentUser } from '@/features/files/repositories/files-repository'

type FilesPageProps = {
  searchParams: Promise<{ fileId?: string }>
}

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const { fileId } = await searchParams
  const result = await listFilesForCurrentUser()

  if (!result.success) {
    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50 px-5 py-4 text-sm text-red-700">
        {result.error}
      </div>
    )
  }

  const initialFileId = fileId && isValidFileId(fileId) ? fileId : null

  return <FilesWorkspace files={result.files} initialFileId={initialFileId} />
}
