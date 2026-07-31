import type { InputHTMLAttributes } from 'react'

import { aosInputClassName, aosInputLgClassName } from '@/lib/design-system'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  size?: 'md' | 'lg'
}

export function Input({ size = 'md', className, ...props }: InputProps) {
  const sizeClassName = size === 'lg' ? aosInputLgClassName : aosInputClassName

  return (
    <input
      className={className ? `${sizeClassName} ${className}` : sizeClassName}
      {...props}
    />
  )
}
