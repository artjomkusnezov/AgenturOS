'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { FileDetailPanel } from '@/features/files/components/file-detail-panel'
import { FileEmptyDetail } from '@/features/files/components/file-empty-detail'
import { FileList } from '@/features/files/components/file-list'
import { FileUploadZone } from '@/features/files/components/file-upload-zone'
import type { FileRecord } from '@/features/files/types/file'

type FilesWorkspaceProps = {
  files: FileRecord[]
  initialFileId?: string | null
}

export function FilesWorkspace({ files, initialFileId = null }: FilesWorkspaceProps) {
  const router = useRouter()
  const [selectedFileId, setSelectedFileId] = useState<string | null>(() => {
    if (!initialFileId) {
      return null
    }

    return files.some((file) => file.id === initialFileId) ? initialFileId : null
  })

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) ?? null,
    [files, selectedFileId]
  )

  const refreshFiles = useCallback(() => {
    router.refresh()
  }, [router])

  const handleSelectFile = useCallback((fileId: string) => {
    setSelectedFileId(fileId)
  }, [])

  const handleUploaded = useCallback(
    (fileId: string) => {
      setSelectedFileId(fileId)
      refreshFiles()
    },
    [refreshFiles]
  )

  const handleBackToList = useCallback(() => {
    setSelectedFileId(null)
  }, [])

  const handleDeleted = useCallback(() => {
    setSelectedFileId(null)
    refreshFiles()
  }, [refreshFiles])

  const showMobileDetail = selectedFile !== null
  const totalCount = files.length

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col lg:flex-row lg:gap-6">
      <section
        aria-label="Dateiliste"
        className={`flex w-full flex-col lg:w-80 lg:shrink-0 ${
          showMobileDetail ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="mb-4">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Dateien</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {totalCount === 1 ? '1 Datei' : `${totalCount} Dateien`}
          </p>
        </div>

        <FileUploadZone onUploaded={handleUploaded} />

        <div className="mt-5 flex-1">
          {totalCount === 0 ? (
            <EmptyState
              title="Noch keine Dateien"
              description="Laden Sie Ihre erste Datei hoch, um sie hier zu verwalten."
            />
          ) : (
            <FileList
              files={files}
              selectedFileId={selectedFileId}
              onSelectFile={handleSelectFile}
            />
          )}
        </div>
      </section>

      <section
        aria-label="Dateidetails"
        className={`min-h-[24rem] flex-1 ${
          showMobileDetail ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {selectedFile ? (
          <FileDetailPanel
            key={selectedFile.id}
            file={selectedFile}
            onBack={handleBackToList}
            onDeleted={handleDeleted}
          />
        ) : (
          <FileEmptyDetail />
        )}
      </section>
    </div>
  )
}
