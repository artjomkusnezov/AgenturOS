import type { HTMLAttributes } from 'react'

import {
  aosAlertErrorClassName,
  aosAlertInfoClassName,
  aosAlertSuccessClassName,
  aosAlertWarningClassName,
} from '@/lib/design-system'

type AlertVariant = 'error' | 'warning' | 'success' | 'info'

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant
}

const variantClassNames: Record<AlertVariant, string> = {
  error: aosAlertErrorClassName,
  warning: aosAlertWarningClassName,
  success: aosAlertSuccessClassName,
  info: aosAlertInfoClassName,
}

export function Alert({ variant = 'error', className, ...props }: AlertProps) {
  const variantClassName = variantClassNames[variant]

  return (
    <div
      role="alert"
      className={className ? `${variantClassName} ${className}` : variantClassName}
      {...props}
    />
  )
}
