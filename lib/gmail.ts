import { createServiceClient } from '@/lib/supabase'

export async function getGmailAccessToken(): Promise<string> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('gmail_tokens')
    .select('refresh_token')
    .eq('email', 'wardvmusic@gmail.com')
    .single()

  if (!data?.refresh_token) throw new Error('No Gmail refresh token found')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  const tokens = await res.json()
  if (!tokens.access_token) throw new Error('Failed to refresh Gmail access token')
  return tokens.access_token
}

export async function fetchEmailById(messageId: string, accessToken: string) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return res.json()
}

export function extractEmailText(message: any): { subject: string; from: string; body: string } {
  const headers = message.payload?.headers ?? []
  const subject = headers.find((h: any) => h.name === 'Subject')?.value ?? ''
  const from = headers.find((h: any) => h.name === 'From')?.value ?? ''

  const body = extractBody(message.payload)
  return { subject, from, body }
}

function extractBody(payload: any): string {
  if (!payload) return ''

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8')
  }

  if (payload.parts) {
    // Prefer text/plain, fall back to text/html
    const plain = payload.parts.find((p: any) => p.mimeType === 'text/plain')
    if (plain?.body?.data) return Buffer.from(plain.body.data, 'base64').toString('utf-8')
    const html = payload.parts.find((p: any) => p.mimeType === 'text/html')
    if (html?.body?.data) return Buffer.from(html.body.data, 'base64').toString('utf-8')
    // Recurse into nested parts
    for (const part of payload.parts) {
      const text = extractBody(part)
      if (text) return text
    }
  }

  return ''
}

export async function registerGmailWatch(accessToken: string) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topicName: `projects/${projectId}/topics/gmail.-inbox`,
      labelIds: ['INBOX'],
    }),
  })
  return res.json()
}
