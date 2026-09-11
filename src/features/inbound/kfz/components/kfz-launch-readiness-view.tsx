import Link from 'next/link'

import { dashboardSurfaceClassName } from '@/features/dashboard/lib/dashboard-surface'
import {
  KFZ_LAUNCH_READINESS_DISCLAIMER,
  KFZ_LAUNCH_READINESS_HEADLINE,
} from '@/features/inbound/kfz/lib/kfz-launch-readiness'
import { KFZ_RELEASE_HANDOFF_HEADLINE } from '@/features/inbound/kfz/types/kfz-release-handoff'
import { KFZ_SUPABASE_OWNER_CHECKLIST } from '@/features/inbound/kfz/lib/kfz-supabase-preflight'
import type {
  KfzLaunchCheck,
  KfzLaunchOwnerStatus,
  KfzLaunchReadinessFact,
  KfzLaunchReadinessItem,
  KfzLaunchReadinessRef,
  KfzLaunchReadinessReport,
  KfzLaunchReadinessStatus,
} from '@/features/inbound/kfz/types/kfz-launch-readiness'
import type { KfzReleaseHandoffSurface } from '@/features/inbound/kfz/types/kfz-release-handoff'
import {
  aosAlertErrorClassName,
  aosAlertSuccessClassName,
  aosAlertWarningClassName,
  aosBadgeClassName,
  aosLinkInlineClassName,
  aosTextBodyClassName,
  aosTextCaptionClassName,
  aosTextMetaClassName,
  aosTextPageTitleClassName,
} from '@/lib/design-system'

const STATUS_LABEL: Record<KfzLaunchReadinessStatus, string> = {
  PASS: 'PASS',
  BLOCKED: 'BLOCKED',
  OWNER_INPUT: 'OWNER INPUT',
  NOT_VERIFIED: 'NOT VERIFIED',
}

const STATUS_CLASS: Record<KfzLaunchReadinessStatus, string> = {
  PASS: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200',
  BLOCKED: 'bg-red-50 text-red-900 ring-1 ring-red-200',
  OWNER_INPUT: 'bg-amber-50 text-amber-950 ring-1 ring-amber-200',
  NOT_VERIFIED: 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200',
}

const OWNER_LABEL: Record<KfzLaunchOwnerStatus, string> = {
  READY: 'READY',
  BLOCKED: 'BLOCKED',
  UNKNOWN: 'UNKNOWN',
}

const OWNER_CLASS: Record<KfzLaunchOwnerStatus, string> = {
  READY: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200',
  BLOCKED: 'bg-red-50 text-red-900 ring-1 ring-red-200',
  UNKNOWN: 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200',
}

const OWNER_ALERT: Record<KfzLaunchOwnerStatus, string> = {
  READY: aosAlertSuccessClassName,
  BLOCKED: aosAlertErrorClassName,
  UNKNOWN: aosAlertWarningClassName,
}

function StatusBadge({ status }: { status: KfzLaunchReadinessStatus }) {
  return (
    <span
      className={`${aosBadgeClassName} ${STATUS_CLASS[status]}`}
      data-kfz-readiness-status={status}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function OwnerBadge({ status }: { status: KfzLaunchOwnerStatus }) {
  return (
    <span
      className={`${aosBadgeClassName} ${OWNER_CLASS[status]}`}
      data-kfz-readiness-owner-status={status}
    >
      {OWNER_LABEL[status]}
    </span>
  )
}

function ReadinessRef({ reference }: { reference: KfzLaunchReadinessRef }) {
  if (reference.kind === 'route' && reference.href) {
    return (
      <Link href={reference.href} className={aosLinkInlineClassName}>
        {reference.label}
      </Link>
    )
  }

  if (reference.kind === 'env' && reference.envName) {
    return (
      <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-800">
        {reference.envName}
      </code>
    )
  }

  return (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-800">
      {reference.path ?? reference.label}
    </code>
  )
}

function FactRow({ fact }: { fact: KfzLaunchReadinessFact }) {
  return (
    <div
      className="border-t border-zinc-100 py-3 first:border-t-0 first:pt-0 last:pb-0"
      data-kfz-readiness-fact={fact.id}
      data-kfz-readiness-status={fact.status}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">{fact.label}</p>
        <StatusBadge status={fact.status} />
      </div>
      <p className={`mt-1.5 ${aosTextBodyClassName} text-sm leading-relaxed text-zinc-600`}>
        {fact.detail}
      </p>
      {fact.refs.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {fact.refs.map((entry) => (
            <li key={`${entry.kind}:${entry.label}`} className={aosTextCaptionClassName}>
              <ReadinessRef reference={entry} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function ItemCard({ item }: { item: KfzLaunchReadinessItem }) {
  return (
    <section
      className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5`}
      data-kfz-readiness-item={item.id}
    >
      <h3 className="text-base font-semibold text-zinc-900">{item.title}</h3>
      <p className={`mt-1 ${aosTextMetaClassName}`}>{item.summary}</p>
      <div className="mt-3">
        {item.facts.map((entry) => (
          <FactRow key={entry.id} fact={entry} />
        ))}
      </div>
    </section>
  )
}

function LaunchCheckRow({ entry }: { entry: KfzLaunchCheck }) {
  return (
    <div
      className="border-t border-zinc-100 py-3 first:border-t-0 first:pt-0 last:pb-0"
        data-kfz-launch-check={entry.id}
        data-kfz-readiness-owner-status={entry.status}
        {...(entry.id === 'analytics'
          ? { 'data-kfz-analytics-health': entry.status }
          : {})}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">{entry.label}</p>
        <OwnerBadge status={entry.status} />
      </div>
      <p className={`mt-1.5 ${aosTextBodyClassName} text-sm leading-relaxed text-zinc-600`}>
        {entry.detail}
      </p>
      {entry.nextAction ? (
        <p
          className={`mt-2 text-sm font-medium text-zinc-800`}
          data-kfz-launch-next-action={entry.id}
        >
          Nächster Schritt: {entry.nextAction}
        </p>
      ) : null}
      {entry.refs.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {entry.refs.map((reference) => (
            <li key={`${reference.kind}:${reference.label}`} className={aosTextCaptionClassName}>
              <ReadinessRef reference={reference} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

type KfzLaunchReadinessViewProps = {
  report: KfzLaunchReadinessReport
}

export function KfzLaunchReadinessView({ report }: KfzLaunchReadinessViewProps) {
  return (
    <div
      className="space-y-5"
      data-kfz-readiness-page="true"
      data-kfz-readiness-production-claim={report.productionClaim ? 'true' : 'false'}
      data-kfz-readiness-scope={report.scope}
      data-kfz-readiness-result={report.result}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Intern · Kfz-Startcheck
        </p>
        <h2 className={`${aosTextPageTitleClassName} mt-1`}>
          {KFZ_LAUNCH_READINESS_HEADLINE}
        </h2>
        <p className={`mt-2 max-w-3xl ${aosTextBodyClassName}`}>
          {KFZ_LAUNCH_READINESS_DISCLAIMER}
        </p>
      </div>

      <section
        className={`${OWNER_ALERT[report.result]} px-4 py-4`}
        data-kfz-readiness-verdict="true"
        data-kfz-readiness-result={report.result}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold">Startlage {OWNER_LABEL[report.result]}</p>
          <OwnerBadge status={report.result} />
        </div>
        <p className="mt-2 text-sm leading-relaxed">{report.resultDetail}</p>
        {report.nextAction ? (
          <p className="mt-3 text-sm font-semibold" data-kfz-readiness-next-action="true">
            Nächster Schritt: {report.nextAction}
          </p>
        ) : (
          <p className="mt-3 text-sm" data-kfz-readiness-next-action="none">
            Kein offener Konfigurationsschritt in diesem Prozess. Go-Live bleibt Owner-Entscheidung.
          </p>
        )}
      </section>

      <section
        className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5`}
        data-kfz-release-handoff="true"
        data-kfz-release-handoff-status={report.handoff.status}
      >
        <HandoffCard handoff={report.handoff} />
      </section>

      <div
        className="grid grid-cols-3 gap-3"
        data-kfz-readiness-owner-counts="true"
      >
        <OwnerCountCard label="READY" value={report.ownerCounts.ready} status="READY" />
        <OwnerCountCard label="BLOCKED" value={report.ownerCounts.blocked} status="BLOCKED" />
        <OwnerCountCard label="UNKNOWN" value={report.ownerCounts.unknown} status="UNKNOWN" />
      </div>

      <section
        className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5`}
        data-kfz-launch-checks="true"
      >
        <h3 className="text-base font-semibold text-zinc-900">
          Launch-Punkte · Namen und Vertrag
        </h3>
        <p className={`mt-1 ${aosTextMetaClassName}`}>
          Fragebogen, öffentliche Konfiguration, Migrationen, privater Bucket, Persistenz,
          Inbox-Item, autorisierte Prüfung, Analytics nur Metadaten. Ein nächster Schritt
          pro Lücke. Keine Secret-Werte.
        </p>
        <div className="mt-3">
          {report.checks.map((entry) => (
            <LaunchCheckRow key={entry.id} entry={entry} />
          ))}
        </div>
      </section>

      <div
        className={`${aosAlertWarningClassName} px-4 py-3`}
        data-kfz-readiness-disclaimer="true"
      >
        <p className="text-sm font-semibold text-amber-950">Keine Produktionsfreigabe</p>
        <p className="mt-1 text-sm leading-relaxed text-amber-950/90">
          READY beschreibt Konfiguration in diesem Prozess, nicht Production. PASS bleibt der
          lokale Vertrags-Detailstatus. BLOCKED ist eine bekannte Lücke. OWNER INPUT braucht
          eine Entscheidung. NOT VERIFIED wurde hier nicht gegen Production geprüft.
        </p>
      </div>

      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        data-kfz-readiness-counts="true"
      >
        <CountCard label="PASS" value={report.counts.pass} status="PASS" />
        <CountCard label="BLOCKED" value={report.counts.blocked} status="BLOCKED" />
        <CountCard label="OWNER INPUT" value={report.counts.ownerInput} status="OWNER_INPUT" />
        <CountCard label="NOT VERIFIED" value={report.counts.notVerified} status="NOT_VERIFIED" />
      </div>

      <div className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5`}>
        <h3 className="text-sm font-semibold text-zinc-900">Verwandte Flächen in AgenturOS</h3>
        <ul className="mt-2 flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-4">
          <li>
            <Link href="/kfz" className={aosLinkInlineClassName}>
              /kfz Landing
            </Link>
          </li>
          <li>
            <Link href="/app/inbox" className={aosLinkInlineClassName}>
              /app/inbox Prüfung
            </Link>
          </li>
          <li>
            <Link href="/app/kfz-analytics" className={aosLinkInlineClassName}>
              /app/kfz-analytics Messung
            </Link>
          </li>
          <li>
            <Link href="/datenschutz" className={aosLinkInlineClassName}>
              /datenschutz
            </Link>
          </li>
        </ul>
        <p className={`mt-3 ${aosTextCaptionClassName}`}>
          Env-Namen ohne Werte:{' '}
          {report.env
            .filter((entry) => entry.requiredFor !== 'optional')
            .map((entry) => entry.name)
            .join(', ')}
          .
        </p>
        <p className={`mt-2 ${aosTextCaptionClassName}`}>
          Konfigurations-Preflight ohne Secrets:{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-800">
            npm run preflight:kfz-supabase
          </code>
        </p>
      </div>

      <section
        className={`${dashboardSurfaceClassName} px-4 py-4 sm:px-5`}
        data-kfz-supabase-owner-checklist="true"
      >
        <h3 className="text-base font-semibold text-zinc-900">
          Owner-Checkliste · bestehendes Supabase + Vercel
        </h3>
        <p className={`mt-1 ${aosTextMetaClassName}`}>
          Eine Liste. Dieser Startcheck wendet keine Migration an und setzt keine Secrets.
          Werte bleiben im bestehenden Vercel-Projekt.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          {KFZ_SUPABASE_OWNER_CHECKLIST.map((step) => (
            <li
              key={step.id}
              className="text-sm leading-relaxed text-zinc-700"
              data-kfz-supabase-owner-step={step.id}
            >
              <span className="font-semibold text-zinc-900">[{step.tool}]</span> {step.instruction}
            </li>
          ))}
        </ol>
      </section>

      {report.items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function HandoffCard({ handoff }: { handoff: KfzReleaseHandoffSurface }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-zinc-900">
          {KFZ_RELEASE_HANDOFF_HEADLINE}
        </h3>
        <StatusBadge status={handoff.status} />
      </div>
      <p className={`mt-1 ${aosTextMetaClassName}`}>
        Merge-first Stack, eingecheckte SQL-Reihenfolge, Commands und Stopp-Bedingungen.
        Keine Secret-Werte. Merge, Apply und Deploy bleiben Owner.
      </p>
      <p className={`mt-3 ${aosTextCaptionClassName}`}>
        Dokument:{' '}
        <span className="break-all font-mono text-xs text-zinc-800">
          {handoff.documentPath}
        </span>
      </p>
      <p
        className={`mt-2 text-sm leading-relaxed text-zinc-800`}
        data-kfz-release-handoff-stack="true"
      >
        Merge-first: {handoff.stackPrNumbers.map((number) => `#${number}`).join(' → ')}
      </p>
      <ul className="mt-2 space-y-1" data-kfz-release-handoff-migrations="true">
        {handoff.migrationFiles.map((file) => (
          <li key={file} className="break-all font-mono text-xs text-zinc-800">
            {file}
          </li>
        ))}
      </ul>
      <p className={`mt-3 text-xs leading-relaxed text-zinc-700`}>
        Automatisiert:{' '}
        {handoff.automatedCommands.map((command) => command).join(' · ')}
      </p>
      <p className={`mt-2 text-xs leading-relaxed text-zinc-700`}>
        Owner-only: {handoff.ownerStepIds.join(', ')}. Stopp:{' '}
        {handoff.stopConditionIds.join(', ')}.
      </p>
    </div>
  )
}

function CountCard({
  label,
  value,
  status,
}: {
  label: string
  value: number
  status: KfzLaunchReadinessStatus
}) {
  return (
    <div
      className={`${dashboardSurfaceClassName} px-3.5 py-3`}
      data-kfz-readiness-count={status}
    >
      <p className={aosTextCaptionClassName}>{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  )
}

function OwnerCountCard({
  label,
  value,
  status,
}: {
  label: string
  value: number
  status: KfzLaunchOwnerStatus
}) {
  return (
    <div
      className={`${dashboardSurfaceClassName} px-3.5 py-3`}
      data-kfz-readiness-owner-count={status}
    >
      <p className={aosTextCaptionClassName}>{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  )
}
