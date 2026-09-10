/**
 * CLI for `npm run preflight:kfz-supabase`.
 * Prints present/missing names and safe facts only. Never prints secret values.
 * Never applies migrations or deploys.
 */

import {
  evaluateKfzSupabasePreflight,
  kfzSupabasePreflightContainsHiddenValue,
  renderKfzSupabasePreflight,
} from '@/features/inbound/kfz/lib/kfz-supabase-preflight'

const report = evaluateKfzSupabasePreflight()
const output = renderKfzSupabasePreflight(report, process.env)

if (kfzSupabasePreflightContainsHiddenValue(output, process.env)) {
  process.stderr.write('Kfz Supabase preflight refused to print a secret-like value.\n')
  process.exit(1)
}

process.stdout.write(output)
process.exit(report.contractOk ? 0 : 1)
