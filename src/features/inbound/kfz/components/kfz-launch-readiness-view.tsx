import Link from 'next/link'

import { dashboardSurfaceClassName } from '@/features/dashboard/lib/dashboard-surface'
import {
  KFZ_LAUNCH_READINESS_DISCLAIMER,
  KFZ_LAUNCH_READINESS_HEADLINE,
} from '@/features/inbound/kfz/lib/kfz-launch-readiness'
import type {
  KfzLaunchReadinessFact,
  KfzLaunchReadinessItem,
  KfzLaunchReadinessRef,
  KfzLaunchReadinessReport,
  KfzLaunchReadinessStatus,
} from '@/features/inbound/kfz/types/kfz-launch-readiness'
import {
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

      <div
        className={`${aosAlertWarningClassName} px-4 py-3`}
        data-kfz-readiness-disclaimer="true"
      >
        <p className="text-sm font-semibold text-amber-950">Keine Produktionsfreigabe</p>
        <p className="mt-1 text-sm leading-relaxed text-amber-950/90">
          PASS beschreibt den lokalen Vertrag. BLOCKED ist eine bekannte Lücke. OWNER INPUT
          braucht eine Entscheidung. NOT VERIFIED wurde hier nicht gegen Production geprüft.
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
      </div>

      {report.items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
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
