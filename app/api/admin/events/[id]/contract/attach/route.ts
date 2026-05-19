import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { addContractAttachment } from '@/app/admin/events/actions'

const BUCKET = 'contracts'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params
    const supabase = createServiceClient()

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {})

    const filePath = `${eventId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, bytes, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    const attachment = { path: filePath, name: file.name, size: file.size, uploaded_at: new Date().toISOString() }
    await addContractAttachment(eventId, attachment)

    return NextResponse.json({ attachment })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Attach error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
