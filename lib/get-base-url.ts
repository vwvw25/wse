import { NextRequest } from 'next/server'

/**
 * Returns the site's public base URL for use in emails and external links.
 *
 * Priority:
 *  1. SITE_URL env var — set this in the Vercel dashboard to your production URL
 *     (e.g. https://your-app.vercel.app). Never falls through to headers if set.
 *  2. Derived from request headers — works on Vercel when SITE_URL is not set,
 *     but will produce localhost URLs if the API is called from local dev.
 */
export function getBaseUrl(req: NextRequest): string {
  const envUrl = process.env.SITE_URL
  if (envUrl) return envUrl.replace(/\/$/, '')

  const forwarded = req.headers.get('x-forwarded-host')
  const host = forwarded ?? req.headers.get('host') ?? ''
  const proto = req.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
