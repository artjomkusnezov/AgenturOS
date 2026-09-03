type DashboardAvatarProps = {
  name: string
  size?: 'sm' | 'md'
  className?: string
  /** Optional photo URL — initials remain the default until a real image exists. */
  src?: string | null
}

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function DashboardAvatar({
  name,
  size = 'sm',
  className = '',
  src = null,
}: DashboardAvatarProps) {
  const initials = initialsFromName(name)
  const sizeClass = size === 'md' ? 'aos-cockpit-avatar--md' : 'aos-cockpit-avatar--sm'

  return (
    <span
      className={`aos-cockpit-avatar ${sizeClass} ${className}`.trim()}
      title={name}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="aos-cockpit-avatar-photo" />
      ) : (
        initials
      )}
    </span>
  )
}
