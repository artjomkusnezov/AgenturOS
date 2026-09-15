import Link from 'next/link'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconActivity } from '@/features/dashboard/components/dashboard-icons'
import {
  INBOX_HISTORY_HEADING,
  INBOX_HISTORY_RETURN_LABEL,
  type InboxManualReviewHistory,
} from '@/features/inbox/lib/inbox-manual-review-history'
import {
  aosTimelineClassName,
  aosTimelineDotNoteClassName,
  aosTimelineDotSystemClassName,
  aosTimelineItemClassName,
  aosWorkspaceActionClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
  aosWsTextPrimaryClassName,
  aosWsTextSecondaryClassName,
} from '@/lib/design-system'

type InboxManualReviewHistorySectionProps = {
  history: InboxManualReviewHistory
}

export function InboxManualReviewHistorySection({
  history,
}: InboxManualReviewHistorySectionProps) {
  return (
    <section aria-label={INBOX_HISTORY_HEADING} className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title={INBOX_HISTORY_HEADING}
        accent="blue"
        icon={<DashboardIconActivity className="h-4 w-4" />}
      />

      <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500">
        Quelltatsachen und spätere Mitarbeiteraktionen bleiben getrennt
      </p>
      <p className={`mb-2 ${aosWorkspaceMetaClassName}`}>{history.aiExclusionLabel}</p>
      <p className={`mb-4 ${aosWorkspaceMetaClassName}`}>{history.limitation}</p>

      <ol className={aosTimelineClassName}>
        {history.events.map((event) => (
          <li key={event.id} className={aosTimelineItemClassName}>
            <div
              className={
                event.layer === 'source'
                  ? aosTimelineDotSystemClassName
                  : aosTimelineDotNoteClassName
              }
              aria-hidden="true"
            />
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${aosWsTextSecondaryClassName}`}>
                {event.layerLabel}
              </p>
              <p className={`aos-ws-timeline-action mt-1 text-[13px] font-medium ${aosWsTextSecondaryClassName}`}>
                {event.label}
              </p>
              <p className={aosWorkspaceMetaClassName}>
                {event.occurredAtLabel}
                <span className="mx-1.5 text-zinc-300">·</span>
                <span>{event.actorLimitation}</span>
              </p>
              <p
                className={`aos-ws-timeline-body mt-1.5 text-[13px] leading-relaxed ${aosWsTextPrimaryClassName}`}
              >
                {event.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5">
        <Link href={history.workHref} className={aosWorkspaceActionClassName}>
          ← {INBOX_HISTORY_RETURN_LABEL}
        </Link>
      </div>
    </section>
  )
}
