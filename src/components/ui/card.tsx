import type { HTMLAttributes } from 'react'

import {
  aosCardClassName,
  aosCardEmptyClassName,
  aosCardPaddedClassName,
  aosCardPanelClassName,
} from '@/lib/design-system'

type CardVariant = 'default' | 'padded' | 'panel' | 'empty'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
}

const variantClassNames: Record<CardVariant, string> = {
  default: aosCardClassName,
  padded: aosCardPaddedClassName,
  panel: aosCardPanelClassName,
  empty: aosCardEmptyClassName,
}

export function Card({ variant = 'default', className, ...props }: CardProps) {
  const variantClassName = variantClassNames[variant]

  return (
    <div
      className={className ? `${variantClassName} ${className}` : variantClassName}
      {...props}
    />
  )
}
