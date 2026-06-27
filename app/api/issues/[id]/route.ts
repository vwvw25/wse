import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: subIssues } = await supabase
    .from('issues')
    .select('*, pm_events(id, name, date), tasks:issues!parent_issue_id(id, status)')
    .eq('parent_issue_id', id)
    .order('created_at')

  return NextResponse.json({ subIssues: subIssues ?? [] })
}
