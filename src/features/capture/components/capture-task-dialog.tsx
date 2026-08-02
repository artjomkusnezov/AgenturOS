'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { attachTaskFileAction } from '@/features/tasks/actions/attach-task-file-action'
import { createTaskAction } from '@/features/tasks/actions/create-task'
import { CaptureDialogShell } from '@/features/capture/components/capture-dialog-shell'
import { CaptureFilePicker } from '@/features/capture/components/capture-file-picker'
import { deleteFileAction } from '@/features/files/actions/delete-file'
import { uploadFileAction } from '@/features/files/actions/upload-file'
import { buildTaskUrlWithAttachmentNotice } from '@/features/capture/lib/task-capture-notice'
import type { CaptureQueueItem, CaptureUploadProgress } from '@/features/capture/types/capture'
import type { AgencyMember } from '@/features/agency/types/agency-member'
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from '@/features/tasks/lib/task-priority'
import {
  aosBtnGhostLgClassName,
  aosBtnPrimaryLgClassName,
  aosFieldErrorSmClassName,
  aosInputLgClassName,
  aosSelectClassName,
  aosTextareaClassName,
  aosTextLabelClassName,
} from '@/lib/design-system'

const UNASSIGNED_ASSIGNEE_VALUE = '__unassigned__'

type CaptureTaskDialogProps = {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  members: AgencyMember[]
  currentUserId: string
}

function getPendingItems(items: CaptureQueueItem[]): CaptureQueueItem[] {
  return items.filter((item) => item.status === 'queued' || item.status === 'error')
}

export function CaptureTaskDialog({
  isOpen,
  onClose,
  triggerRef,
  members,
  currentUserId,
}: CaptureTaskDialogProps) {
  const router = useRouter()
  const processingRef = useRef(false)
  const queueItemsRef = useRef<CaptureQueueItem[]>([])
  const defaultAssigneeUserId = currentUserId || members[0]?.userId || UNASSIGNED_ASSIGNEE_VALUE

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeUserId, setAssigneeUserId] = useState(defaultAssigneeUserId)
  const [priority, setPriority] = useState('normal')
  const [dueDate, setDueDate] = useState('')
  const [queueItems, setQueueItems] = useState<CaptureQueueItem[]>([])
  const [titleError, setTitleError] = useState<string | null>(null)
  const [dueDateError, setDueDateError] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<CaptureUploadProgress | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null)

  useEffect(() => {
    queueItemsRef.current = queueItems
  }, [queueItems])

  const updateQueueItem = useCallback((clientId: string, update: Partial<CaptureQueueItem>) => {
    setQueueItems((previous) => {
      const next = previous.map((item) =>
        item.clientId === clientId ? { ...item, ...update } : item,
      )
      queueItemsRef.current = next
      return next
    })
  }, [])

  const handleQueueItemsChange = useCallback((items: CaptureQueueItem[]) => {
    queueItemsRef.current = items
    setQueueItems(items)
  }, [])

  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setAssigneeUserId(defaultAssigneeUserId)
    setPriority('normal')
    setDueDate('')
    setQueueItems([])
    queueItemsRef.current = []
    setTitleError(null)
    setDueDateError(null)
    setGlobalError(null)
    setUploadProgress(null)
    setCreatedTaskId(null)
  }, [defaultAssigneeUserId])

  const handleClose = useCallback(() => {
    if (isProcessing) {
      return
    }

    resetForm()
    onClose()
  }, [isProcessing, onClose, resetForm])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (processingRef.current || isProcessing) {
        return
      }

      const trimmedTitle = title.trim()

      if (!trimmedTitle) {
        setTitleError('Bitte geben Sie einen Titel ein.')
        return
      }

      const snapshotItems = queueItemsRef.current
      const invalidQueued = getPendingItems(snapshotItems).filter((item) => item.error)

      if (invalidQueued.length > 0) {
        setGlobalError('Bitte entfernen oder ersetzen Sie ungültige Dateien vor dem Speichern.')
        return
      }

      const pendingItems = getPendingItems(snapshotItems).filter((item) => item.file.size > 0)

      if (getPendingItems(snapshotItems).length > 0 && pendingItems.length === 0) {
        setGlobalError('Die ausgewählten Dateien sind leer und können nicht hochgeladen werden.')
        return
      }

      setTitleError(null)
      setDueDateError(null)
      setGlobalError(null)
      processingRef.current = true
      setIsProcessing(true)

      try {
        let taskId = createdTaskId

        if (!taskId) {
          const formData = new FormData()
          formData.set('title', trimmedTitle)
          formData.set('description', description)
          formData.set('assigneeUserId', assigneeUserId)
          formData.set('priority', priority)
          formData.set('dueDate', dueDate)

          const createResult = await createTaskAction({}, formData)

          if (createResult.fieldErrors?.title) {
            setTitleError(createResult.fieldErrors.title)
            return
          }

          if (createResult.fieldErrors?.dueDate) {
            setDueDateError(createResult.fieldErrors.dueDate)
            return
          }

          if (!createResult.success || !createResult.taskId) {
            setGlobalError(createResult.error ?? 'Die Aufgabe konnte nicht erstellt werden.')
            return
          }

          taskId = createResult.taskId
          setCreatedTaskId(taskId)
        }

        const totalCount = pendingItems.length
        let attachedCount = 0
        let lastFailureMessage: string | null = null

        for (let index = 0; index < pendingItems.length; index += 1) {
          const item = pendingItems[index]

          updateQueueItem(item.clientId, { status: 'uploading', error: undefined })
          setUploadProgress({
            current: index + 1,
            total: pendingItems.length,
            filename: item.file.name,
          })

          const uploadFormData = new FormData()
          uploadFormData.set('file', item.file)
          const uploadResult = await uploadFileAction({}, uploadFormData)

          if (!uploadResult.success || !uploadResult.fileId) {
            lastFailureMessage =
              uploadResult.error ??
              uploadResult.fieldErrors?.file ??
              'Upload fehlgeschlagen.'
            updateQueueItem(item.clientId, {
              status: 'error',
              error: lastFailureMessage,
            })
            continue
          }

          const attachFormData = new FormData()
          attachFormData.set('taskId', taskId)
          attachFormData.set('fileId', uploadResult.fileId)
          const attachResult = await attachTaskFileAction({}, attachFormData)

          if (!attachResult.success) {
            const rollbackFormData = new FormData()
            rollbackFormData.set('fileId', uploadResult.fileId)
            await deleteFileAction({}, rollbackFormData)

            lastFailureMessage =
              attachResult.error ?? 'Die Datei konnte nicht mit der Aufgabe verknüpft werden.'
            updateQueueItem(item.clientId, {
              status: 'error',
              error: lastFailureMessage,
            })
            continue
          }

          attachedCount += 1
          // Drop the large blob after a successful attach so the next camera
          // file is not held alongside already-uploaded originals.
          updateQueueItem(item.clientId, {
            status: 'success',
            error: undefined,
            fileId: uploadResult.fileId,
            file: new File([], item.file.name, {
              type: item.file.type || 'application/octet-stream',
            }),
          })
        }

        setUploadProgress(null)

        if (totalCount > 0 && attachedCount < totalCount) {
          setGlobalError(
            attachedCount === 0
              ? lastFailureMessage ??
                  'Die Aufgabe wurde erstellt, aber die Dateien konnten nicht angehängt werden. Bitte erneut versuchen.'
              : `Aufgabe erstellt. ${attachedCount} von ${totalCount} Dateien wurden angehängt. Fehlgeschlagene Dateien bitte erneut versuchen.`,
          )
          router.refresh()
          return
        }

        router.refresh()
        resetForm()
        onClose()
        router.push(buildTaskUrlWithAttachmentNotice(taskId, attachedCount, totalCount))
      } finally {
        processingRef.current = false
        setIsProcessing(false)
        setUploadProgress(null)
      }
    },
    [
      assigneeUserId,
      createdTaskId,
      description,
      dueDate,
      isProcessing,
      onClose,
      priority,
      resetForm,
      router,
      title,
      updateQueueItem,
    ],
  )

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={handleClose}
        disabled={isProcessing}
        className={aosBtnGhostLgClassName}
      >
        Abbrechen
      </button>
      <button
        type="submit"
        form="capture-task-form"
        disabled={isProcessing || !title.trim()}
        className={aosBtnPrimaryLgClassName}
      >
        {isProcessing
          ? 'Wird erstellt …'
          : createdTaskId
            ? 'Dateien erneut anhängen'
            : 'Aufgabe erstellen'}
      </button>
    </div>
  )

  return (
    <CaptureDialogShell
      isOpen={isOpen}
      title="Neue Aufgabe"
      description="Aufgabe vollständig erfassen – Verantwortlicher, Priorität und Fälligkeit optional."
      onClose={handleClose}
      closeDisabled={isProcessing}
      triggerRef={triggerRef}
      footer={footer}
    >
      <form id="capture-task-form" onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="capture-task-title" className={aosTextLabelClassName}>
              Titel <span className="text-red-600">*</span>
            </label>
            <input
              id="capture-task-title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isProcessing}
              autoFocus
              placeholder="Was soll erledigt werden?"
              className={aosInputLgClassName}
            />
            {titleError ? <p className={aosFieldErrorSmClassName}>{titleError}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="capture-task-description" className={aosTextLabelClassName}>
              Beschreibung
              <span className="font-normal text-zinc-500"> (optional)</span>
            </label>
            <textarea
              id="capture-task-description"
              name="description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isProcessing}
              placeholder="Weitere Details …"
              className={`${aosTextareaClassName} min-h-[5rem]`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="capture-task-assignee" className={aosTextLabelClassName}>
                Verantwortlicher
              </label>
              <select
                id="capture-task-assignee"
                name="assigneeUserId"
                value={assigneeUserId}
                onChange={(event) => setAssigneeUserId(event.target.value)}
                disabled={isProcessing}
                className={aosSelectClassName}
              >
                <option value={UNASSIGNED_ASSIGNEE_VALUE}>Nicht zugeordnet</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.displayName}
                    {member.userId === currentUserId ? ' (Ich)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="capture-task-priority" className={aosTextLabelClassName}>
                Priorität
              </label>
              <select
                id="capture-task-priority"
                name="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                disabled={isProcessing}
                className={aosSelectClassName}
              >
                {TASK_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {TASK_PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="capture-task-due" className={aosTextLabelClassName}>
                Fälligkeit
                <span className="font-normal text-zinc-500"> (optional)</span>
              </label>
              <input
                id="capture-task-due"
                name="dueDate"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={isProcessing}
                className={aosInputLgClassName}
              />
              {dueDateError ? <p className={aosFieldErrorSmClassName}>{dueDateError}</p> : null}
            </div>
          </div>

          <div>
            <p className={`mb-2 ${aosTextLabelClassName}`}>
              Dateien
              <span className="font-normal text-zinc-500"> (optional)</span>
            </p>
            <CaptureFilePicker
              items={queueItems}
              onItemsChange={handleQueueItemsChange}
              isUploading={uploadProgress !== null}
              onRetry={() => undefined}
              locked={false}
              validationMode="full"
              showCameraAction
            />
          </div>

          <div role="status" aria-live="polite" className="space-y-2">
            {uploadProgress ? (
              <p className="text-sm text-zinc-600">
                Datei {uploadProgress.current} von {uploadProgress.total}: {uploadProgress.filename}
              </p>
            ) : null}
            {globalError ? <p className={aosFieldErrorSmClassName}>{globalError}</p> : null}
          </div>
        </div>
      </form>
    </CaptureDialogShell>
  )
}
