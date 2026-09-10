/**
 * Public Supabase boot configuration.
 * Reports only present/missing names. Never returns or prints secret values
 * on the failure path. Never reads a service-role credential.
 */

export const NEXT_PUBLIC_SUPABASE_URL_NAME = 'NEXT_PUBLIC_SUPABASE_URL' as const
export const NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME =
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' as const
export const NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME =
  'NEXT_PUBLIC_SUPABASE_ANON_KEY' as const

export const SUPABASE_PUBLIC_CONFIG_MISSING_ERROR =
  'Die öffentliche Supabase-Konfiguration fehlt. Im bestehenden Vercel-Projekt NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY setzen. Der ältere Name NEXT_PUBLIC_SUPABASE_ANON_KEY wird nur als Fallback gelesen. Werte werden nicht angezeigt.' as const

export const OPAQUE_SUPABASE_CLIENT_BOOT_ERROR =
  "Your project's URL and Key are required to create a Supabase client" as const

export type PublicSupabaseEnvSource = Record<string, string | undefined>

export type PublicSupabaseKeyName =
  | typeof NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME
  | typeof NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME

export type PublicSupabaseConfig = {
  url: string
  key: string
  keyName: PublicSupabaseKeyName
}

export type PublicSupabaseConfigOk = {
  ok: true
} & PublicSupabaseConfig

export type PublicSupabaseConfigMissing = {
  ok: false
  error: typeof SUPABASE_PUBLIC_CONFIG_MISSING_ERROR
  missingNames: readonly string[]
}

export type PublicSupabaseConfigResult =
  | PublicSupabaseConfigOk
  | PublicSupabaseConfigMissing

export type PublicSupabaseBootState =
  | { ready: true }
  | {
      ready: false
      error: typeof SUPABASE_PUBLIC_CONFIG_MISSING_ERROR
      missingNames: readonly string[]
    }

export class SupabasePublicConfigError extends Error {
  readonly missingNames: readonly string[]

  constructor(missingNames: readonly string[] = []) {
    super(SUPABASE_PUBLIC_CONFIG_MISSING_ERROR)
    this.name = 'SupabasePublicConfigError'
    this.missingNames = missingNames
  }
}

function readTrimmed(env: PublicSupabaseEnvSource, name: string): string {
  return env[name]?.trim() ?? ''
}

function isUsablePublicUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function readPublicSupabaseConfig(
  env: PublicSupabaseEnvSource = process.env,
): PublicSupabaseConfigResult {
  const url = readTrimmed(env, NEXT_PUBLIC_SUPABASE_URL_NAME)
  const publishable = readTrimmed(env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME)
  const legacyAnon = readTrimmed(env, NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME)
  const key = publishable || legacyAnon
  const keyName: PublicSupabaseKeyName | null = publishable
    ? NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME
    : legacyAnon
      ? NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME
      : null

  const missingNames: string[] = []
  if (!url || !isUsablePublicUrl(url)) {
    missingNames.push(NEXT_PUBLIC_SUPABASE_URL_NAME)
  }
  if (!key || !keyName) {
    missingNames.push(NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME)
  }

  if (missingNames.length > 0 || !keyName) {
    return {
      ok: false,
      error: SUPABASE_PUBLIC_CONFIG_MISSING_ERROR,
      missingNames:
        missingNames.length > 0
          ? missingNames
          : [NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME],
    }
  }

  return {
    ok: true,
    url,
    key,
    keyName,
  }
}

export function getPublicSupabaseBootState(
  env: PublicSupabaseEnvSource = process.env,
): PublicSupabaseBootState {
  const config = readPublicSupabaseConfig(env)
  if (config.ok) {
    return { ready: true }
  }
  return {
    ready: false,
    error: config.error,
    missingNames: config.missingNames,
  }
}

export function shouldRefreshPublicSupabaseSession(
  env: PublicSupabaseEnvSource = process.env,
): boolean {
  return readPublicSupabaseConfig(env).ok
}

export function requirePublicSupabaseConfig(
  env: PublicSupabaseEnvSource = process.env,
): PublicSupabaseConfig {
  const config = readPublicSupabaseConfig(env)
  if (!config.ok) {
    throw new SupabasePublicConfigError(config.missingNames)
  }
  return {
    url: config.url,
    key: config.key,
    keyName: config.keyName,
  }
}
