import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { logEventActivity } from '@/lib/event-activity'
import { revalidatePath } from 'next/cache'

const BUCKET = 'musician-invoices'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slotId: string }> }) {
  try {
    const { slotId } = await params
    const supabase = createServiceClient()

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {})

    // Remove any existing file for this slot first
    const { data: existing } = await supabase
      .from('event_musicians')
      .select('musician_invoice_path, event_id, instrument, musician:musicians(first_name, last_name)')
      .eq('id', slotId)
      .single()

    if (existing?.musician_invoice_path) {
      await supabase.storage.from(BUCKET).remove([existing.musician_invoice_path]).catch(() => {})
    }

    const filePath = `${slotId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, bytes, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    await supabase
      .from('event_musicians')
      .update({ musician_invoice_path: filePath, musician_invoice_filename: file.name })
      .eq('id', slotId)

    if (existing?.event_id) {
      revalidatePath('/admin/musician-invoices')
      revalidatePath(`/admin/events/${existing.event_id}`)
      const musician = existing.musician as unknown as { first_name: string; last_name: string } | null
      const label = musician ? `${musician.first_name} ${musician.last_name} (${existing.instrument})` : existing.instrument
      await logEventActivity(existing.event_id, {
        type: 'invoice_change',
        summary: `Musician invoice uploaded for ${label}`,
      })
    }

    return NextResponse.json({ path: filePath, filename: file.name })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
