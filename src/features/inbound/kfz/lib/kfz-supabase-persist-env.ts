/**
 * Named Supabase persist env for private Kfz document storage.
 * Reports only present/missing. Never returns secret values.
 */

export const KFZ_SUPABASE_PERSIST_ENV_NAMES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

export type KfzSupabasePersistEnvName =
  (typeof KFZ_SUPABASE_PERSIST_ENV_NAMES)[number]

export const KFZ_SUPABASE_PERSIST_MISSING_ERROR =
  'Service-Role-Konfiguration fehlt.' as const

export type KfzSupabaseEnvSource = Record<string, string | undefined>

export type KfzSupabasePersistEnvPresence = {
  name: KfzSupabasePersistEnvName
  present: boolean
}

export function isNamedEnvPresent(
  name: string,
  env: KfzSupabaseEnvSource = process.env,
): boolean {
  return Boolean(env[name]?.trim())
}

export function snapshotKfzSupabasePersistEnv(
  env: KfzSupabaseEnvSource = process.env,
): KfzSupabasePersistEnvPresence[] {
  return KFZ_SUPABASE_PERSIST_ENV_NAMES.map((name) => ({
    name,
    present: isNamedEnvPresent(name, env),
  }))
}

export function listMissingKfzSupabasePersistEnvNames(
  env: KfzSupabaseEnvSource = process.env,
): KfzSupabasePersistEnvName[] {
  return snapshotKfzSupabasePersistEnv(env)
    .filter((entry) => !entry.present)
    .map((entry) => entry.name)
}

export function isKfzSupabasePersistConfigured(
  env: KfzSupabaseEnvSource = process.env,
): boolean {
  return listMissingKfzSupabasePersistEnvNames(env).length === 0
}

/**
 * Fail-closed persist gate. Does not construct a Supabase client and
 * never returns env values.
 */
export function kfzSupabasePersistFailClosed(env: KfzSupabaseEnvSource = process.env): {
  allowsStore: boolean
  error: typeof KFZ_SUPABASE_PERSIST_MISSING_ERROR | null
  missing: readonly KfzSupabasePersistEnvName[]
} {
  const missing = listMissingKfzSupabasePersistEnvNames(env)
  if (missing.length > 0) {
    return {
      allowsStore: false,
      error: KFZ_SUPABASE_PERSIST_MISSING_ERROR,
      missing,
    }
  }
  return { allowsStore: true, error: null, missing: [] }
}
