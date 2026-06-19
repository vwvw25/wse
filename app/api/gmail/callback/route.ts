import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'No code' }, { status: 400 })

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/gmail/callback`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await res.json()
  if (!tokens.refresh_token) {
    return NextResponse.json({ error: 'No refresh token', tokens }, { status: 400 })
  }

  const supabase = createServiceClient()
  await supabase.from('gmail_tokens').upsert({
    email: 'wardvmusic@gmail.com',
    refresh_token: tokens.refresh_token,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'email' })

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/admin/settings?gmail=connected`)
}
