export type LoginInput = {
  email: string
  password: string
}

export type LoginResult =
  | { success: true }
  | { success: false; error: string }

export type LoginFieldErrors = Partial<
  Record<'email' | 'password' | 'form', string>
>

export type LoginActionState = {
  fieldErrors?: LoginFieldErrors
  error?: string
}
