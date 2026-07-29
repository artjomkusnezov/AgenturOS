type EmptyStateProps = {
  title: string
  description: string
}

function EmptyStateIcon() {
  return (
    <svg
      className="mx-auto h-8 w-8 text-zinc-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M8 12h8" />
    </svg>
  )
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <EmptyStateIcon />
      <p className="mt-4 text-sm font-medium text-zinc-800">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">
        {description}
      </p>
    </div>
  )
}
