import { InformationWorkspace } from '@/features/information/components/information-workspace'
import { listInformationItemsForCurrentUser } from '@/features/information/repositories/information-repository'
import { isValidInformationItemId } from '@/features/information/lib/validate-information-item'

type InformationPageProps = {
  searchParams: Promise<{ itemId?: string }>
}

export default async function InformationPage({ searchParams }: InformationPageProps) {
  const { itemId } = await searchParams
  const result = await listInformationItemsForCurrentUser()

  if (!result.success) {
    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50 px-5 py-4 text-sm text-red-700">
        {result.error}
      </div>
    )
  }

  const initialItemId =
    itemId && isValidInformationItemId(itemId) ? itemId : null

  return (
    <InformationWorkspace
      items={result.items}
      initialItemId={initialItemId}
    />
  )
}
