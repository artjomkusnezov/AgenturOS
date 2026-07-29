export type RegistrationInput = {
  firstName: string
  lastName: string
  agencyName: string
  email: string
  password: string
}

export type RegistrationResult =
  | { success: true }
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
}
