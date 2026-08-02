import { InformationWorkspace } from '@/features/information/components/information-workspace'
import { isValidInformationItemId } from '@/features/information/lib/validate-information-item'
import { listInformationItemsForCurrentUser } from '@/features/information/repositories/information-repository'
import { aosAlertErrorClassName } from '@/lib/design-system'

type InformationPageProps = {
  searchParams: Promise<{ item?: string; itemId?: string }>
}

export default async function InformationPage({ searchParams }: InformationPageProps) {
  const { item, itemId } = await searchParams
  const selectedParam = item ?? itemId ?? null
  const result = await listInformationItemsForCurrentUser()

  if (!result.success) {
    return (
      <div className={`${aosAlertErrorClassName} px-5 py-4`}>
        {result.error}
      </div>
    )
  }

  const selectedItemId =
    selectedParam &&
    isValidInformationItemId(selectedParam) &&
    result.items.some((entry) => entry.id === selectedParam)
      ? selectedParam
      : null

  return (
    <InformationWorkspace
      items={result.items}
      selectedItemId={selectedItemId}
    />
  )
}
