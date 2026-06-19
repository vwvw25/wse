import { NextResponse } from 'next/server'
import { getGmailAccessToken, registerGmailWatch } from '@/lib/gmail'

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = await getGmailAccessToken()
  const result = await registerGmailWatch(accessToken)
  return NextResponse.json(result)
}
