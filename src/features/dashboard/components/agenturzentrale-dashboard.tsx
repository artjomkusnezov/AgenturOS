import Image from 'next/image'
import Link from 'next/link'

import { DashboardAvatar } from '@/features/dashboard/components/dashboard-avatar'
import {
  DashboardIconAlert,
  DashboardIconBriefcase,
  DashboardIconCalendar,
  DashboardIconCheckSquare,
  DashboardIconFileText,
  DashboardIconFlag,
  DashboardIconInbox,
  DashboardIconInfo,
  DashboardIconMic,
  DashboardIconTarget,
  DashboardIconUser,
} from '@/features/dashboard/components/dashboard-icons'
import type {
  AttentionBucket,
  DashboardAttentionItem,
} from '@/features/dashboard/lib/dashboard-attention'
import { getDailyQuote } from '@/features/dashboard/lib/dashboard-daily-quote'
import {
  formatDashboardDateOrTime,
  splitInboxFeedContent,
} from '@/features/dashboard/lib/dashboard-format'
import {
  getDashboardDateLabel,
  getFirstNameFromUser,
  getTimeOfDayGreeting,
} from '@/features/dashboard/lib/dashboard-greeting'
import { resolveInboxSourceVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import type {
  DashboardCaseTypeCount,
  DashboardMyWorkCaseItem,
} from '@/features/dashboard/lib/dashboard-my-work'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'
import type { DashboardTaskItem, DashboardTeamTasksResult } from '@/features/dashboard/lib/dashboard-tasks'
import { getInboxSourceLabel } from '@/features/inbox/lib/inbox-source'
import { resolveInboxAttributionLabel } from '@/features/inbox/lib/resolve-inbox-attribution'
import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import type { DashboardDailyQuote } from '@/features/dashboard/lib/dashboard-daily-quote'

export type AgenturzentraleDashboardProps = {
  user: {
    user_metadata?: Record<string, unknown>
  }
  unprocessedInboxItems: InboxItem[]
  attentionItems: DashboardAttentionItem[]
  attentionCount: number
  myTasks: DashboardTaskItem[]
  myOpenTaskCount: number
  teamTasks: DashboardTeamTasksResult
  activeCaseCount: number
  caseTypeCounts: DashboardCaseTypeCount[]
  recentlyUpdated: DashboardMyWorkCaseItem[]
  memberNameMap?: Record<string, string>
}

const BUCKET_ORDER: AttentionBucket[] = ['overdue', 'today', 'soon', 'waiting']

const BUCKET_LABEL: Record<AttentionBucket, string> = {
  overdue: 'Überfällig',
  today: 'Heute',
  soon: 'Morgen',
  waiting: 'In Bearbeitung',
}

function sourceAccentClass(accent: string): string {
  if (accent === 'blue') return 'az-channel--blue'
  if (accent === 'green') return 'az-channel--green'
  if (accent === 'violet') return 'az-channel--violet'
  if (accent === 'orange') return 'az-channel--orange'
  return 'az-channel--neutral'
}

function Hero({
  dateLabel,
  greetingTitle,
  dailyQuote,
}: {
  dateLabel: string
  greetingTitle: string
  dailyQuote: DashboardDailyQuote
}) {
  return (
    <header className="az-hero" aria-labelledby="az-hero-heading">
      <div className="az-hero-media" aria-hidden="true">
        <Image
          src="/hero-agenturzentrale.jpg"
          alt=""
          width={1920}
          height={1080}
          priority
          unoptimized
          className="az-hero-image"
        />
        <div className="az-hero-overlay" />
      </div>
      <div className="az-hero-copy">
        <p className="az-hero-date">{dateLabel}</p>
        <h1 id="az-hero-heading" className="az-hero-title">
          {greetingTitle}
        </h1>
        <blockquote className="az-hero-quote-block">
          <p className="az-hero-quote">
            <span className="az-hero-quote-mark" aria-hidden="true">
              “
            </span>
            {dailyQuote.text}
          </p>
          <footer className="az-hero-quote-author">— {dailyQuote.author}</footer>
        </blockquote>
      </div>
    </header>
  )
}

function LageStrip({
  inboxCount,
  attentionCount,
  activeCaseCount,
}: {
  inboxCount: number
  attentionCount: number
  activeCaseCount: number
}) {
  return (
    <section className="az-lage" aria-label="Die Lage heute">
      <article className="az-lage-card az-lage-card--blue">
        <span className="az-lage-icon" aria-hidden="true">
          <DashboardIconInbox className="az-glyph" />
        </span>
        <div className="az-lage-copy">
          <span className="az-lage-label">Neue Eingänge</span>
          <span className="az-lage-value">{inboxCount}</span>
          <span className="az-lage-meta">{inboxCount === 0 ? 'Eingang leer' : 'Noch zu sichten'}</span>
        </div>
      </article>
      <article className="az-lage-card az-lage-card--orange">
        <span className="az-lage-icon" aria-hidden="true">
          <DashboardIconAlert className="az-glyph" />
        </span>
        <div className="az-lage-copy">
          <span className="az-lage-label">Braucht Aufmerksamkeit</span>
          <span className="az-lage-value">{attentionCount}</span>
          <span className="az-lage-meta">{attentionCount === 0 ? 'Nichts dringend' : 'Fristen & Prioritäten'}</span>
        </div>
      </article>
      <article className="az-lage-card az-lage-card--violet">
        <span className="az-lage-icon" aria-hidden="true">
          <DashboardIconBriefcase className="az-glyph" />
        </span>
        <div className="az-lage-copy">
          <span className="az-lage-label">Aktive Vorgänge</span>
          <span className="az-lage-value">{activeCaseCount}</span>
          <span className="az-lage-meta">Offen / in Arbeit</span>
        </div>
      </article>
      <article className="az-lage-card az-lage-card--cyan">
        <span className="az-lage-icon" aria-hidden="true">
          <DashboardIconInfo className="az-glyph" />
        </span>
        <div className="az-lage-copy">
          <span className="az-lage-label">Letzte Information</span>
          <span className="az-lage-value az-lage-value--empty">–</span>
          <span className="az-lage-meta">Noch keine Information verfügbar</span>
        </div>
      </article>
    </section>
  )
}

function InboxPanel({
  items,
  memberNameMap,
}: {
  items: InboxItem[]
  memberNameMap: Record<string, string>
}) {
  const total = sanitizeDashboardCount(items.length)
  const preview = items.slice(0, 3)

  return (
    <section className="az-panel az-panel--inbox" aria-labelledby="az-inbox-heading">
      <header className="az-panel-header">
        <span className="az-panel-icon az-panel-icon--blue" aria-hidden="true">
          <DashboardIconInbox className="az-glyph az-glyph--sm" />
        </span>
        <h2 id="az-inbox-heading" className="az-panel-title">
          Neue Eingänge
        </h2>
        {total > 0 ? <span className="az-count az-count--blue">{total}</span> : null}
      </header>

      {preview.length === 0 ? (
        <p className="az-empty">Keine neuen Eingänge.</p>
      ) : (
        <ul className="az-list">
          {preview.map((item) => {
            const { title } = splitInboxFeedContent(item.content)
            const visual = resolveInboxSourceVisual(item.source)
            const creator = resolveInboxAttributionLabel(item, memberNameMap)
            const isNew = isInboxItemUnprocessed(item)

            return (
              <li key={item.id} className="az-list-item">
                <Link
                  href={`/app/inbox?item=${encodeURIComponent(item.id)}`}
                  className="az-row"
                >
                  <span
                    className={`az-channel ${sourceAccentClass(visual.accent)}`}
                    title={visual.label}
                    aria-hidden="true"
                  >
                    {visual.icon}
                  </span>
                  <span className="az-row-main">
                    <span className="az-row-title">{title}</span>
                    <span className="az-row-meta">
                      <span>{getInboxSourceLabel(item.source)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{creator}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDashboardDateOrTime(item.created_at)}</span>
                    </span>
                  </span>
                  {isNew ? <span className="az-chip az-chip--new">Neu</span> : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <Link href="/app/inbox" className="az-panel-link">
        Alle Eingänge anzeigen
      </Link>
    </section>
  )
}

function AttentionPanel({
  items,
  totalCount,
}: {
  items: DashboardAttentionItem[]
  totalCount: number
}) {
  const preview = items.slice(0, 3)
  const groups = BUCKET_ORDER.map((bucket) => ({
    bucket,
    items: preview.filter((item) => item.bucket === bucket),
  })).filter((group) => group.items.length > 0)

  return (
    <section className="az-panel az-panel--attention" aria-labelledby="az-attention-heading">
      <header className="az-panel-header">
        <span className="az-panel-icon az-panel-icon--orange" aria-hidden="true">
          <DashboardIconAlert className="az-glyph az-glyph--sm" />
        </span>
        <h2 id="az-attention-heading" className="az-panel-title">
          Was ist jetzt wichtig?
        </h2>
        {totalCount > 0 ? <span className="az-count az-count--orange">{totalCount}</span> : null}
      </header>

      {preview.length === 0 ? (
        <p className="az-empty">Aktuell nichts Dringendes.</p>
      ) : (
        <div className="az-attention-groups">
          {groups.map((group) => (
            <div key={group.bucket} className="az-attention-group">
              <p className={`az-group-label az-group-label--${group.bucket}`}>
                {BUCKET_LABEL[group.bucket]}
              </p>
              <ul className="az-list">
                {group.items.map((item) => (
                  <li key={item.caseId} className="az-list-item">
                    <Link href={item.href} className="az-row">
                      <span
                        className={`az-row-rail az-row-rail--${item.bucket}`}
                        aria-hidden="true"
                      />
                      <span className="az-row-main">
                        <span className="az-row-title">{item.title}</span>
                        <span className="az-row-meta">
                          <span className={`az-chip az-chip--${item.bucket}`}>
                            {item.bucketLabel}
                          </span>
                          <span>{item.typeLabel}</span>
                          {item.dueLabel ? (
                            <span className="inline-flex items-center gap-0.5">
                              <DashboardIconCalendar className="h-3 w-3" />
                              {item.dueLabel}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {item.assigneeName ? (
                        <DashboardAvatar name={item.assigneeName} />
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Link href="/app/cases" className="az-panel-link">
        Alle Vorgänge anzeigen
      </Link>
    </section>
  )
}

function NextStepPanel({
  tasks,
  totalCount,
  memberNameMap,
}: {
  tasks: DashboardTaskItem[]
  totalCount: number
  memberNameMap: Record<string, string>
}) {
  const preview = tasks.slice(0, 3)
  const [featured, ...rest] = preview
  const assigneeName = featured?.assigneeUserId
    ? memberNameMap[featured.assigneeUserId]
    : undefined

  return (
    <section className="az-panel az-panel--next" aria-labelledby="az-next-heading">
      <header className="az-panel-header">
        <span className="az-panel-icon az-panel-icon--violet" aria-hidden="true">
          <DashboardIconCheckSquare className="az-glyph az-glyph--sm" />
        </span>
        <h2 id="az-next-heading" className="az-panel-title">
          Mein nächster Schritt
        </h2>
        {totalCount > 0 ? <span className="az-count az-count--violet">{totalCount}</span> : null}
      </header>

      {!featured ? (
        <p className="az-empty">Keine Priorität bestimmt.</p>
      ) : (
        <div className="az-next-stack">
          <Link href={featured.href} className="az-next-hero">
            <div className="az-next-banner">Nächster Schritt</div>
            <div className="az-next-body">
              <p className="az-next-title">{featured.title}</p>
              <p className="az-row-meta">
                {featured.dueLabel ? (
                  <span
                    className={`az-chip ${
                      featured.isOverdue
                        ? 'az-chip--overdue'
                        : featured.isDueToday
                          ? 'az-chip--today'
                          : 'az-chip--soon'
                    }`}
                  >
                    <DashboardIconCalendar className="h-3 w-3" />
                    {featured.dueLabel}
                  </span>
                ) : null}
                {featured.priority === 'high' ? (
                  <span className="az-chip az-chip--overdue">
                    <DashboardIconFlag className="h-3 w-3" />
                    Hoch
                  </span>
                ) : null}
                {assigneeName ? (
                  <span className="az-next-owner">
                    <DashboardIconUser className="h-3 w-3" />
                    {assigneeName}
                  </span>
                ) : null}
              </p>
              <span className="az-next-cta">Jetzt öffnen</span>
            </div>
          </Link>

          {rest.length > 0 ? (
            <ul className="az-list">
              {rest.map((task) => (
                <li key={task.taskId} className="az-list-item">
                  <Link href={task.href} className="az-row">
                    <span className="az-row-main">
                      <span className="az-row-title">{task.title}</span>
                      <span className="az-row-meta">
                        {task.dueLabel ? <span>{task.dueLabel}</span> : null}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <Link href="/app/tasks" className="az-panel-link">
        Alle meine Aufgaben anzeigen
      </Link>
    </section>
  )
}

function ManagementWidgets({
  caseTypeCounts,
  recentlyUpdated,
}: {
  caseTypeCounts: DashboardCaseTypeCount[]
  recentlyUpdated: DashboardMyWorkCaseItem[]
}) {
  const hasWork = caseTypeCounts.length > 0 || recentlyUpdated.length > 0

  return (
    <aside className="az-rail" aria-label="Management">
      <div className="az-rail-card">
        <div className="az-rail-heading">
          <span className="az-panel-icon az-panel-icon--green" aria-hidden="true">
            <DashboardIconTarget className="az-glyph az-glyph--sm" />
          </span>
          <h2 className="az-rail-title">Agenturziel</h2>
          <span className="az-planned">Geplant</span>
        </div>
        <p className="az-rail-empty">Noch nicht eingerichtet</p>
      </div>

      <div className="az-rail-card">
        <div className="az-rail-heading">
          <span className="az-panel-icon az-panel-icon--blue" aria-hidden="true">
            <DashboardIconUser className="az-glyph az-glyph--sm" />
          </span>
          <h2 className="az-rail-title">Mein Ziel</h2>
          <span className="az-planned">Geplant</span>
        </div>
        <p className="az-rail-empty">Noch nicht eingerichtet</p>
      </div>

      <div className="az-rail-card">
        <div className="az-rail-heading">
          <span className="az-panel-icon az-panel-icon--violet" aria-hidden="true">
            <DashboardIconBriefcase className="az-glyph az-glyph--sm" />
          </span>
          <h2 className="az-rail-title">Meine Arbeit</h2>
        </div>
        {!hasWork ? (
          <p className="az-rail-empty">Keine offenen Vorgänge.</p>
        ) : (
          <div className="az-work-summary">
            {caseTypeCounts.slice(0, 4).map((entry) => (
              <div key={entry.typeKey} className="az-work-line">
                <span>{entry.typeLabel}</span>
                <span className="az-work-count">{entry.count}</span>
              </div>
            ))}
            {recentlyUpdated.slice(0, 2).map((item) => (
              <Link key={item.caseId} href={item.href} className="az-work-recent">
                <span className="az-row-title">{item.title}</span>
                <span className="az-row-meta">{item.updatedLabel}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="az-rail-card az-rail-card--actions">
        <h2 className="az-rail-title">Schnellzugriff</h2>
        <div className="az-quick-grid">
          {[
            { label: 'Notiz', tone: 'blue', Icon: DashboardIconFileText },
            { label: 'Aufgabe', tone: 'violet', Icon: DashboardIconCheckSquare },
            { label: 'Schaden', tone: 'orange', Icon: DashboardIconFlag },
            { label: 'Sprache', tone: 'green', Icon: DashboardIconMic },
            { label: 'Info', tone: 'cyan', Icon: DashboardIconInfo },
          ].map((action) => (
            <button
              key={action.label}
              type="button"
              className={`az-quick az-quick--${action.tone}`}
              aria-label={`${action.label} – über + Neu verfügbar`}
            >
              <span className="az-quick-icon" aria-hidden="true">
                <action.Icon className="az-glyph az-glyph--sm" />
              </span>
              <span className="az-quick-label">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

export function AgenturzentraleDashboard({
  user,
  unprocessedInboxItems,
  attentionItems,
  attentionCount,
  myTasks,
  myOpenTaskCount,
  activeCaseCount,
  caseTypeCounts,
  recentlyUpdated,
  memberNameMap = {},
}: AgenturzentraleDashboardProps) {
  const safeInboxItems = Array.isArray(unprocessedInboxItems) ? unprocessedInboxItems : []
  const safeAttentionItems = Array.isArray(attentionItems) ? attentionItems : []
  const safeMyTasks = Array.isArray(myTasks) ? myTasks : []
  const safeCaseTypeCounts = Array.isArray(caseTypeCounts) ? caseTypeCounts : []
  const safeRecentlyUpdated = Array.isArray(recentlyUpdated) ? recentlyUpdated : []

  const unprocessedInboxCount = sanitizeDashboardCount(safeInboxItems.length)
  const safeAttentionCount = sanitizeDashboardCount(attentionCount)
  const safeMyOpenTaskCount = sanitizeDashboardCount(myOpenTaskCount)
  const safeActiveCaseCount = sanitizeDashboardCount(activeCaseCount)

  const firstName = getFirstNameFromUser(user)
  const greeting = getTimeOfDayGreeting()
  const greetingTitle = firstName ? `${greeting}, ${firstName}` : greeting

  return (
    <div className="az-shell">
      <div className="az-frame">
        <div className="az-primary">
          <Hero
            dateLabel={getDashboardDateLabel()}
            greetingTitle={greetingTitle}
            dailyQuote={getDailyQuote()}
          />

          <LageStrip
            inboxCount={unprocessedInboxCount}
            attentionCount={safeAttentionCount}
            activeCaseCount={safeActiveCaseCount}
          />

          <div className="az-workbench">
            <InboxPanel items={safeInboxItems} memberNameMap={memberNameMap} />
            <AttentionPanel items={safeAttentionItems} totalCount={safeAttentionCount} />
            <NextStepPanel
              tasks={safeMyTasks}
              totalCount={safeMyOpenTaskCount}
              memberNameMap={memberNameMap}
            />
          </div>
        </div>

        <ManagementWidgets
          caseTypeCounts={safeCaseTypeCounts}
          recentlyUpdated={safeRecentlyUpdated}
        />
      </div>
    </div>
  )
}
