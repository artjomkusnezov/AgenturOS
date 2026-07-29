export type ForgotPasswordInput = {
  email: string
}

export type ForgotPasswordFieldErrors = Partial<Record<'email' | 'form', string>>

export type ForgotPasswordActionState = {
  fieldErrors?: ForgotPasswordFieldErrors
  error?: string
  success?: boolean
}

export type ResetPasswordInput = {
  password: string
  passwordConfirmation: string
}

export type ResetPasswordFieldErrors = Partial<
  Record<'password' | 'passwordConfirmation' | 'form', string>
>

export type ResetPasswordActionState = {
  fieldErrors?: ResetPasswordFieldErrors
  error?: string
}
