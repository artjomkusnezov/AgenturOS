import type { ButtonHTMLAttributes } from 'react'

import {
  aosBtnDangerClassName,
  aosBtnGhostClassName,
  aosBtnGhostLgClassName,
  aosBtnPrimaryClassName,
  aosBtnPrimaryLgClassName,
  aosBtnSecondaryClassName,
  aosBtnSecondaryLgClassName,
  aosBtnSmClassName,
  aosBtnXsClassName,
} from '@/lib/design-system'

type ButtonVariant =
  | 'primary'
  | 'primary-lg'
  | 'secondary'
  | 'secondary-lg'
  | 'ghost'
  | 'ghost-lg'
  | 'danger'
  | 'sm'
  | 'xs'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const variantClassNames: Record<ButtonVariant, string> = {
  primary: aosBtnPrimaryClassName,
  'primary-lg': aosBtnPrimaryLgClassName,
  secondary: aosBtnSecondaryClassName,
  'secondary-lg': aosBtnSecondaryLgClassName,
  ghost: aosBtnGhostClassName,
  'ghost-lg': aosBtnGhostLgClassName,
  danger: aosBtnDangerClassName,
  sm: aosBtnSmClassName,
  xs: aosBtnXsClassName,
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const variantClassName = variantClassNames[variant]

  return (
    <button
      type={type}
      className={className ? `${variantClassName} ${className}` : variantClassName}
      {...props}
    />
  )
}
