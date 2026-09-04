import { aosEmptyStateClassName, aosWsTextMetaClassName, aosWsTextPrimaryClassName } from '@/lib/design-system'

type EmptyStateProps = {
  title: string
  description: string
}

function EmptyStateIcon() {
  return (
    <span className="aos-ws-empty-icon mx-auto" aria-hidden="true">
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <path d="M8 12h8" />
      </svg>
    </span>
  )
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className={aosEmptyStateClassName}>
      <EmptyStateIcon />
      <p className={`mt-3 text-sm font-medium ${aosWsTextPrimaryClassName}`}>{title}</p>
      <p className={`mx-auto mt-1.5 max-w-sm text-sm leading-relaxed ${aosWsTextMetaClassName}`}>
        {description}
      </p>
    </div>
  )
}
