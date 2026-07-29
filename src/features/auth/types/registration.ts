export type RegistrationInput = {
  firstName: string
  lastName: string
  agencyName: string
  email: string
  password: string
}

export type RegistrationResult =
  | {
      success: true
      requiresEmailConfirmation: boolean
      hasSession: boolean
    }
  | { success: false; error: string }

export type RegistrationFieldErrors = Partial<
  Record<
    'firstName' | 'lastName' | 'agencyName' | 'email' | 'password' | 'form',
    string
  >
>

export type RegistrationActionState = {
  fieldErrors?: RegistrationFieldErrors
  error?: string
  success?: boolean
  requiresEmailConfirmation?: boolean
}
