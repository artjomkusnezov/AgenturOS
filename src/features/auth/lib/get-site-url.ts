import { headers } from 'next/headers'

export function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) {
    return 'http://localhost:3000'
  }

  let url = trimmed

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }

  return url.replace(/\/$/, '')
}

export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (configured) {
    return normalizeSiteUrl(configured)
  }

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()

  if (productionUrl) {
    return normalizeSiteUrl(productionUrl)
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()

  if (vercelUrl) {
    return normalizeSiteUrl(vercelUrl)
  }

  if (process.env.NODE_ENV !== 'production') {
    const headersList = await headers()
    const forwardedHost = headersList.get('x-forwarded-host')
    const host = forwardedHost ?? headersList.get('host')

    if (host) {
      const protocol = headersList.get('x-forwarded-proto') ?? 'http'
      return normalizeSiteUrl(`${protocol}://${host}`)
    }
  }

  return 'http://localhost:3000'
}

export async function getAuthCallbackUrl(): Promise<string> {
  return `${await getSiteUrl()}/auth/callback`
}
