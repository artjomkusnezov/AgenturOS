import { NextResponse } from 'next/server'

import { completeAuthenticatedSession } from '@/features/auth/services/complete-authenticated-session'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=callback', request.url))
  }

  const supabase = await createClient()
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(new URL('/login?error=callback', request.url))
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.redirect(new URL('/login?error=callback', request.url))
  }

  const sessionResult = await completeAuthenticatedSession()

  if (!sessionResult.success) {
    return NextResponse.redirect(new URL('/login?error=setup', request.url))
  }

  return NextResponse.redirect(new URL('/app', request.url))
}
