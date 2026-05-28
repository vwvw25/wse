import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const BUCKET = 'musician-invoices'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slotId: string }> }) {
  try {
    const { slotId } = await params
    const supabase = createServiceClient()

    const { data: slot } = await supabase
      .from('event_musicians')
      .select('musician_invoice_path')
      .eq('id', slotId)
      .single()

    if (!slot?.musician_invoice_path) {
      return NextResponse.json({ error: 'No invoice on file' }, { status: 404 })
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(slot.musician_invoice_path, 3600)

    if (error || !data) throw new Error('Could not create signed URL')

    return NextResponse.redirect(data.signedUrl)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
