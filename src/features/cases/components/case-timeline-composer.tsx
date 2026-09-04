'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { attachCaseTimelineFileAction } from '@/features/cases/actions/attach-case-timeline-file-action'
import type { CaseTimelineFileMutationState } from '@/features/cases/actions/attach-case-timeline-file-action'
import { createCaseTimelineNoteAction } from '@/features/cases/actions/create-case-timeline-note-action'
import type { CaseTimelineNoteMutationState } from '@/features/cases/actions/create-case-timeline-note-action'
import {
  aosFieldErrorClassName,
  aosTextareaClassName,
  aosWorkspaceActionAccentClassName,
  aosWorkspaceActionEmphasisClassName,
} from '@/lib/design-system'

type CaseTimelineComposerProps = {
  caseId: string
}

const noteInitialState: CaseTimelineNoteMutationState = {}
const fileInitialState: CaseTimelineFileMutationState = {}

export function CaseTimelineComposer({ caseId }: CaseTimelineComposerProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'note' | 'file'>('note')
  const [noteState, noteAction, notePending] = useActionState(
    createCaseTimelineNoteAction,
    noteInitialState,
  )
  const [fileState, fileAction, filePending] = useActionState(
    attachCaseTimelineFileAction,
    fileInitialState,
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const noteHandledRef = useRef(false)
  const fileHandledRef = useRef(false)

  useEffect(() => {
    noteHandledRef.current = false
    fileHandledRef.current = false
  }, [caseId])

  useEffect(() => {
    if (noteState.success && !noteHandledRef.current) {
      noteHandledRef.current = true
      if (textareaRef.current) {
        textareaRef.current.value = ''
      }
      router.refresh()
    }
  }, [noteState.success, router])

  useEffect(() => {
    if (fileState.success && !fileHandledRef.current) {
      fileHandledRef.current = true
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setMode('note')
      router.refresh()
    }
  }, [fileState.success, router])

  const isPending = notePending || filePending

  return (
    <div className="mt-5 border-t border-zinc-100 pt-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('note')}
          disabled={isPending}
          className={aosWorkspaceActionAccentClassName}
          aria-pressed={mode === 'note'}
        >
          + Notiz
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('file')
            queueMicrotask(() => fileInputRef.current?.click())
          }}
          disabled={isPending}
          className={aosWorkspaceActionAccentClassName}
          aria-pressed={mode === 'file'}
        >
          + Datei
        </button>
      </div>

      {mode === 'note' ? (
        <form action={noteAction}>
          <input type="hidden" name="caseId" value={caseId} />
          <label htmlFor={`case-timeline-note-${caseId}`} className="sr-only">
            Notiz hinzufügen
          </label>
          <textarea
            ref={textareaRef}
            id={`case-timeline-note-${caseId}`}
            name="content"
            rows={3}
            disabled={isPending}
            placeholder="Notiz hinzufügen..."
            className={`${aosTextareaClassName} min-h-[4.5rem]`}
          />
          {noteState.fieldErrors?.content ? (
            <p className={`mt-2 ${aosFieldErrorClassName}`}>{noteState.fieldErrors.content}</p>
          ) : null}
          {noteState.error ? (
            <p className={`mt-2 ${aosFieldErrorClassName}`}>{noteState.error}</p>
          ) : null}
          <div className="mt-2.5 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className={aosWorkspaceActionEmphasisClassName}
            >
              {notePending ? '…' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      ) : (
        <form action={fileAction} className="flex flex-col gap-2">
          <input type="hidden" name="caseId" value={caseId} />
          <label htmlFor={`case-timeline-file-${caseId}`} className="sr-only">
            Datei hinzufügen
          </label>
          <input
            ref={fileInputRef}
            id={`case-timeline-file-${caseId}`}
            name="file"
            type="file"
            disabled={isPending}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-sky-200 hover:file:bg-white/15"
            onChange={(event) => {
              const form = event.currentTarget.form
              if (form && event.currentTarget.files?.length) {
                form.requestSubmit()
              }
            }}
          />
          {fileState.fieldErrors?.file ? (
            <p className={aosFieldErrorClassName}>{fileState.fieldErrors.file}</p>
          ) : null}
          {fileState.error ? (
            <p className={aosFieldErrorClassName}>{fileState.error}</p>
          ) : null}
          {filePending ? (
            <p className="text-[12px] text-zinc-500">Datei wird hinzugefügt …</p>
          ) : null}
        </form>
      )}
    </div>
  )
}
