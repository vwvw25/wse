import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

function getAnthropicKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  try {
    const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = envFile.match(/^ANTHROPIC_API_KEY=(.+)$/m)
    if (match) return match[1].trim()
  } catch { /* ignore */ }
  throw new Error('ANTHROPIC_API_KEY not set')
}

const BUCKET = 'contracts'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params
    const supabase = createServiceClient()
    const client = new Anthropic({ apiKey: getAnthropicKey() })

    const form = await req.formData()
    const file = form.get('pdf') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const base64 = Buffer.from(buffer).toString('base64')

    // Ensure bucket exists
    await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {/* already exists */})

    // Upload PDF to storage — use a timestamp prefix so multiple uploads don't overwrite each other
    const filePath = `${eventId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, bytes, { contentType: 'application/pdf', upsert: false })

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    // Parse with Claude
    const message = await client.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            {
              type: 'text',
              text: `Extract the following fields from this entertainment/performance contract.
Return ONLY valid JSON with exactly these keys. Use null for any field not found or not clearly stated.
Times must be 24-hour HH:MM format. Dates must be YYYY-MM-DD. Fee must be a number (no currency symbol).

{
  "event_date": "YYYY-MM-DD or null",
  "agency_name": "booking agency name or null",
  "agent_name": "agent/booker name or null",
  "client_email": "string or null",
  "venue_name": "string or null",
  "venue_address": "full street address (not including postcode) or null",
  "venue_postcode": "UK postcode or null",
  "location": "city or area e.g. Central London or null",
  "guests": "number or null",
  "arrival_time": "HH:MM soundcheck/arrival/load-in time or null",
  "start_time": "HH:MM performance start time or null",
  "finish_time": "HH:MM performance finish time or null",
  "load_out_time": "HH:MM load out time or null",
  "band_size": "e.g. Duo, Trio, Quartet, 5-piece or null",
  "sets_requested": "e.g. 2 x 45 mins or null",
  "fee": "number in GBP or null"
}`,
            },
          ],
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    const parsed = JSON.parse(jsonStr)

    return NextResponse.json({
      parsed,
      file: { name: file.name, size: file.size, path: filePath },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Contract error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET — return a signed download URL as JSON { url }
// ?path= can override the default file_path (for attachments)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const supabase = createServiceClient()

  const pathParam = req.nextUrl.searchParams.get('path')
  let filePath: string | undefined = pathParam ?? undefined

  if (!filePath) {
    const { data: event } = await supabase.from('events').select('contract').eq('id', eventId).single()
    filePath = event?.contract?.file_path
  }

  if (!filePath) return NextResponse.json({ error: 'No contract on file' }, { status: 404 })

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60 * 60)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl })
}
