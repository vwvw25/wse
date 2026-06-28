import { NextRequest, NextResponse } from 'next/server'
import { processInbox } from '../process-inbox'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await processInbox()
  return NextResponse.json(result)
}
