import { LeadsWorkspace } from '@/features/leads/components/leads-workspace'
import { presentKfzLeadsWorkspace } from '@/features/leads/lib/present-kfz-leads'
import { listInboxItemsForCurrentUser } from '@/features/inbox/repositories/inbox-repository'
import { aosAlertErrorClassName } from '@/lib/design-system'

type LeadsPageProps = {
  searchParams: Promise<{
    item?: string
    status?: string
  }>
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const { item, status } = await searchParams
  const result = await listInboxItemsForCurrentUser()

  if (!result.success) {
    return <div className={`${aosAlertErrorClassName} px-5 py-4`}>{result.error}</div>
  }

  const view = presentKfzLeadsWorkspace({
    unprocessedItems: result.unprocessedItems,
    processedItems: result.processedItems,
    selectedItemId: item,
    status,
  })

  const emptyTitle = view.totalCount === 0 ? 'Keine Kfz-Leads' : 'Keine Leads in diesem Filter'
  const emptyDescription =
    view.totalCount === 0
      ? 'Neue Website-Anfragen erscheinen hier, sobald sie im Eingang liegen. Es wird kein Vorgang automatisch angelegt.'
      : 'Dieser Statusfilter ist leer. Offene Leads bleiben über den Filter „Offen“ sichtbar.'

  return (
    <LeadsWorkspace
      rows={view.rows}
      items={view.items}
      selectedItemId={view.selectedItemId}
      selectedDetail={view.selectedDetail}
      statusFilter={view.statusFilter}
      filterHrefs={view.filterHrefs}
      metaLabel={view.metaLabel}
      hrefBasePath={view.hrefBasePath}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  )
}
