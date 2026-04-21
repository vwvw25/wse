import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true'

  let query = supabase.from('notifications').select('*').order('created_at', { ascending: false })
  if (unreadOnly) query = query.is('read_at', null)

  const { data } = await query
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  // Mark notifications as read
  const supabase = createServiceClient()
  const { ids } = await req.json() as { ids: string[] }
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids)
  return NextResponse.json({ ok: true })
}
