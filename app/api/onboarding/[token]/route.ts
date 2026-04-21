import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET — return token + musician data for client-side fetch if needed
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: tokenRow, error } = await supabase
    .from('musician_onboarding_tokens')
    .select('*, musician:musicians(*)')
    .eq('token', token)
    .single()

  if (error || !tokenRow) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  return NextResponse.json({
    token: tokenRow.token,
    musician: tokenRow.musician,
    type: tokenRow.type,
    fieldsRequested: tokenRow.fields_requested,
    completedAt: tokenRow.completed_at,
  })
}

// POST — submit form data
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const supabase = createServiceClient()

    // Fetch and validate token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('musician_onboarding_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (tokenErr || !tokenRow) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    if (tokenRow.completed_at) {
      return NextResponse.json({ error: 'This form has already been submitted' }, { status: 409 })
    }

    const body = await req.json() as Record<string, unknown>
    const type = tokenRow.type as 'general' | 'info_request'
    const fieldsRequested = tokenRow.fields_requested as string[]

    // Build update object — only allow known safe fields
    const ALLOWED_FIELDS = new Set([
      'phone',
      'home_city',
      'default_fee',
      'dietary_requirements',
      'primary_instrument',
      'secondary_instrument',
      'car_registration',
      'car_make',
      'car_model',
      'car_colour',
      'date_of_birth',
      'passport_number',
      'covid_vaccinated',
      'covid_booster',
    ])

    const update: Record<string, unknown> = {}

    if (type === 'general') {
      // General onboard: accept the standard base fields plus any extras
      const generalBase = ['phone', 'home_city', 'default_fee', 'dietary_requirements', 'primary_instrument', 'secondary_instrument']
      const allowedForGeneral = new Set([...generalBase, ...fieldsRequested])
      for (const [key, value] of Object.entries(body)) {
        if (ALLOWED_FIELDS.has(key) && allowedForGeneral.has(key)) {
          update[key] = value
        }
      }
    } else {
      // Info request: only accept the specifically requested fields
      const allowedForInfoRequest = new Set(fieldsRequested)
      for (const [key, value] of Object.entries(body)) {
        if (ALLOWED_FIELDS.has(key) && allowedForInfoRequest.has(key)) {
          update[key] = value
        }
      }
    }

    if (Object.keys(update).length > 0) {
      const { error: updateErr } = await supabase
        .from('musicians')
        .update(update)
        .eq('id', tokenRow.musician_id)

      if (updateErr) {
        console.error('onboarding update error:', updateErr)
        return NextResponse.json({ error: 'Failed to save details' }, { status: 500 })
      }
    }

    // Mark token as completed
    await supabase
      .from('musician_onboarding_tokens')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', tokenRow.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('onboarding POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
