'use client'

import Link from 'next/link'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import {
  formatCaseCoreStatusLabel,
  formatCaseDueAtLabel,
  formatCasePriorityLabel,
  isCaseDueOverdue,
  isCaseOpenForDue,
  resolveBusinessAreaLabel,
  resolveCaseTypeKey,
  resolveCaseTypeLabel,
  type CaseDisplayLookups,
} from '@/features/cases/lib/case-display'
import type { CaseRecord } from '@/features/cases/types/case'
import {
  DashboardIconCalendar,
  DashboardIconCheckSquare,
  DashboardIconFileText,
  DashboardIconFlag,
  DashboardIconInbox,
} from '@/features/dashboard/components/dashboard-icons'
import { CaseTimeline } from '@/features/cases/components/case-timeline'
import { CaseTimelineNoteForm } from '@/features/cases/components/case-timeline-note-form'
import type { CaseTimelineEntry } from '@/features/cases/types/case-timeline'
import { InboxAttachmentSection } from '@/features/inbox/components/inbox-attachment-section'
import { getInboxSourceLabel } from '@/features/inbox/lib/inbox-source'
import { formatInboxDateTime } from '@/features/inbox/lib/inbox-status'
import type { InboxItem, InboxLinkedFile } from '@/features/inbox/types/inbox-item'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import {
  aosDocBodyClassName,
  aosDocTitleClassName,
  aosPanelHeaderClassName,
  aosWorkspaceActionAccentClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
  aosWorkspaceSurfaceClassName,
} from '@/lib/design-system'

export type CaseInboxOriginView = {
  inboxItem: InboxItem
  attachments: InboxLinkedFile[]
}

type CaseDetailPanelProps = {
  caseRow: CaseRecord
  memberNameMap: Record<string, string>
  lookups: CaseDisplayLookups
  origin: CaseInboxOriginView | null
  timelineEntries: CaseTimelineEntry[]
  onBack: () => void
}

function CaseTypeIcon({ typeKey }: { typeKey: string | null }) {
  const className = 'h-4 w-4'

  switch (typeKey) {
    case 'task':
      return <DashboardIconCheckSquare className={className} />
    case 'claim':
      return <DashboardIconFlag className={className} />
    case 'follow_up':
    case 'appointment':
      return <DashboardIconCalendar className={className} />
    case 'offer':
    case 'contract':
    case 'general':
    default:
      return <DashboardIconFileText className={className} />
  }
}

export function CaseDetailPanel({
  caseRow,
  memberNameMap,
  lookups,
  origin,
  timelineEntries,
  onBack,
}: CaseDetailPanelProps) {
  const typeLabel = resolveCaseTypeLabel(caseRow.case_type_id, lookups.caseTypesById)
  const typeKey = resolveCaseTypeKey(caseRow.case_type_id, lookups.caseTypesById)
  const businessAreaLabel = resolveBusinessAreaLabel(
    caseRow.business_area_id,
    lookups.businessAreasById,
  )
  const statusLabel = formatCaseCoreStatusLabel(caseRow.core_status)
  const priorityLabel = formatCasePriorityLabel(caseRow.priority)
  const assigneeName = caseRow.assignee_user_id
    ? resolveTaskMemberName(caseRow.assignee_user_id, memberNameMap)
    : 'Nicht zugewiesen'
  const dueLabel = caseRow.due_at
    ? formatCaseDueAtLabel(caseRow.due_at, undefined, isCaseOpenForDue(caseRow))
    : null
  const dueOverdue = isCaseDueOverdue(caseRow)
  const description = caseRow.description?.trim() ?? ''

  const metaParts = [
    statusLabel,
    businessAreaLabel,
    assigneeName,
    `Priorität ${priorityLabel}`,
  ]

  return (
    <div className={`${aosWorkspaceSurfaceClassName} min-h-[24rem] lg:min-h-0`}>
      <div className={aosPanelHeaderClassName}>
        <button
          type="button"
          onClick={onBack}
          className="mb-2 inline-flex items-center text-xs font-medium text-zinc-400 transition-colors duration-150 hover:text-zinc-800 lg:hidden"
        >
          ← Liste
        </button>

        <p className={`flex items-center gap-2 ${aosWorkspaceMetaClassName}`}>
          <span className="shrink-0 text-zinc-500">
            <CaseTypeIcon typeKey={typeKey} />
          </span>
          <span>{typeLabel}</span>
        </p>

        <h2 className={`mt-2 ${aosDocTitleClassName}`}>{caseRow.title}</h2>

        <p className={`mt-2 ${aosWorkspaceMetaClassName}`}>
          {metaParts.map((part, index) => (
            <span key={`${part}-${index}`}>
              {index > 0 ? <span className="mx-1.5 text-zinc-300">·</span> : null}
              <span>{part}</span>
            </span>
          ))}
          {dueLabel ? (
            <>
              <span className="mx-1.5 text-zinc-300">·</span>
              <span className={dueOverdue ? 'font-medium text-red-600' : undefined}>
                Fällig {dueLabel}
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <section aria-label="Beschreibung" className={aosWorkspaceSectionClassName}>
          <WorkspaceSectionHeading
            title="Beschreibung"
            accent="blue"
            icon={<DashboardIconFileText className="h-4 w-4" />}
          />
          {description ? (
            <p className={`${aosDocBodyClassName} whitespace-pre-wrap`}>{description}</p>
          ) : (
            <p className={aosWorkspaceMetaClassName}>Keine Beschreibung vorhanden.</p>
          )}
        </section>

        {origin ? (
          <section aria-label="Ursprünglicher Eingang" className={aosWorkspaceSectionClassName}>
            <WorkspaceSectionHeading
              title="Ursprünglicher Eingang"
              accent="orange"
              icon={<DashboardIconInbox className="h-4 w-4" />}
            />
            <p className={aosWorkspaceMetaClassName}>
              <span>{getInboxSourceLabel(origin.inboxItem.source)}</span>
              <span className="mx-1.5 text-zinc-300">·</span>
              <span>{formatInboxDateTime(origin.inboxItem.created_at)}</span>
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {origin.inboxItem.content}
            </p>
            <div className="mt-3">
              <Link
                href={`/app/inbox?item=${encodeURIComponent(origin.inboxItem.id)}`}
                className={aosWorkspaceActionAccentClassName}
              >
                Zum Eingang
              </Link>
            </div>
          </section>
        ) : null}

        <CaseTimeline entries={timelineEntries} memberNameMap={memberNameMap} />

        <section aria-label="Notiz hinzufügen" className={aosWorkspaceSectionClassName}>
          <CaseTimelineNoteForm
            key={timelineEntries.length}
            caseId={caseRow.id}
          />
        </section>

        {origin ? <InboxAttachmentSection attachments={origin.attachments} /> : null}
      </div>
    </div>
  )
}
