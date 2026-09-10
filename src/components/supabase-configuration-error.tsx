import Link from 'next/link'

import {
  NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME,
  NEXT_PUBLIC_SUPABASE_URL_NAME,
  SUPABASE_PUBLIC_CONFIG_MISSING_ERROR,
} from '@/lib/supabase/public-config'
import {
  aosAlertWarningClassName,
  aosLinkInlineClassName,
  aosTextBodyClassName,
  aosTextPageTitleClassName,
} from '@/lib/design-system'

type SupabaseConfigurationErrorProps = {
  missingNames?: readonly string[]
}

/**
 * Safe /app boot surface when public Supabase names are absent.
 * Lists env names only. Never renders URL or key values.
 */
export function SupabaseConfigurationError({
  missingNames = [],
}: SupabaseConfigurationErrorProps) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className={aosTextPageTitleClassName}>Konfiguration unvollständig</h1>
        <p className={`mt-3 ${aosTextBodyClassName}`}>
          {SUPABASE_PUBLIC_CONFIG_MISSING_ERROR}
        </p>
        <p className={`mt-4 ${aosTextBodyClassName}`}>
          Für den Dashboard-Start im bestehenden Vercel-Projekt diese Namen
          setzen. Werte bleiben in Vercel und werden hier nicht angezeigt:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
          <li>{NEXT_PUBLIC_SUPABASE_URL_NAME}</li>
          <li>{NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME}</li>
        </ul>
        <p className={`mt-3 ${aosTextBodyClassName}`}>
          Der ältere Name {NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME} wird nur als
          Fallback gelesen.
        </p>
        {missingNames.length > 0 ? (
          <p className={`mt-4 ${aosAlertWarningClassName}`}>
            In diesem Prozess fehlen: {missingNames.join(', ')}
          </p>
        ) : null}
        <p className="mt-6 text-sm text-zinc-600">
          Die öffentliche Kfz-Strecke bleibt unabhängig vom Dashboard erreichbar.{' '}
          <Link href="/kfz" className={aosLinkInlineClassName}>
            Zur Kfz-Seite
          </Link>
        </p>
      </div>
    </div>
  )
}
