import { headers } from 'next/headers'

export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (configured) {
    return configured.replace(/\/$/, '')
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()

  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, '')}`
  }

  const headersList = await headers()
  const forwardedHost = headersList.get('x-forwarded-host')
  const host = forwardedHost ?? headersList.get('host')

  if (host) {
    const protocol = headersList.get('x-forwarded-proto') ?? 'http'
    return `${protocol}://${host}`
  }

  return 'http://localhost:3000'
}

export async function getAuthCallbackUrl(): Promise<string> {
  return `${await getSiteUrl()}/auth/callback`
}
