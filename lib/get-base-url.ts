import { NextRequest } from 'next/server'

/**
 * Derives the site's base URL from the incoming request headers.
 * This is more reliable than NEXT_PUBLIC_SITE_URL which can be misconfigured.
 */
export function getBaseUrl(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-host')
  const host = forwarded ?? req.headers.get('host') ?? ''
  const proto = req.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
