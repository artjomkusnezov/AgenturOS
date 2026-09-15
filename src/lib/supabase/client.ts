import { createBrowserClient } from '@supabase/ssr'

import { requirePublicSupabaseConfig } from './public-config'
import type { Database } from './types'

export function createClient() {
  const config = requirePublicSupabaseConfig()
  return createBrowserClient<Database>(config.url, config.key)
}
