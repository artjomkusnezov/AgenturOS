import type { HTMLAttributes } from 'react'

import {
  aosBadgeEmphasisClassName,
  aosBadgeNeutralClassName,
  aosBadgeNeutralSubduedClassName,
} from '@/lib/design-system'

type BadgeVariant = 'neutral' | 'neutral-subdued' | 'emphasis'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

const variantClassNames: Record<BadgeVariant, string> = {
  neutral: aosBadgeNeutralClassName,
  'neutral-subdued': aosBadgeNeutralSubduedClassName,
  emphasis: aosBadgeEmphasisClassName,
}

export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  const variantClassName = variantClassNames[variant]

  return (
    <span
      className={className ? `${variantClassName} ${className}` : variantClassName}
      {...props}
    />
  )
}
