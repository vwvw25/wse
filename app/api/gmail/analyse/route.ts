import { NextRequest, NextResponse } from 'next/server'
import { getGmailAccessToken, fetchEmailById, extractEmailText } from '@/lib/gmail'
import Anthropic from '@anthropic-ai/sdk'

function getAnthropicKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  try {
    const fs = require('fs')
    const path = require('path')
    const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = envFile.match(/^ANTHROPIC_API_KEY=(.+)$/m)
    if (match) return match[1].trim()
  } catch {}
  return ''
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = await getGmailAccessToken()

  // Fetch 100 message IDs from inbox
  const listRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&labelIds=INBOX',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const listData = await listRes.json()
  const messages = listData.messages ?? []

  // Fetch each email (just metadata — snippet + headers, not full body, to stay fast)
  const summaries: string[] = []
  for (const { id } of messages) {
    const msg = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const data = await msg.json()
    const headers = data.payload?.headers ?? []
    const subject = headers.find((h: any) => h.name === 'Subject')?.value ?? '(no subject)'
    const from = headers.find((h: any) => h.name === 'From')?.value ?? '(unknown)'
    const snippet = data.snippet ?? ''
    summaries.push(`From: ${from}\nSubject: ${subject}\nSnippet: ${snippet}`)
  }

  const anthropic = new Anthropic({ apiKey: getAnthropicKey() })
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are analysing the inbox of a music entertainment agency called Ward Show Entertainment.

Here are 100 recent emails. Categorise them and give me:
1. A breakdown of email types with counts and percentages
2. The most common senders/sender types
3. Any patterns worth noting
4. Suggested categories for an inbox triage system

Emails:
${summaries.join('\n\n---\n\n')}`,
    }],
  })

  const analysis = response.content[0].type === 'text' ? response.content[0].text : ''
  return new NextResponse(analysis, { headers: { 'Content-Type': 'text/plain' } })
}
