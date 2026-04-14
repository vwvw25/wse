import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'
import { calculate, DEFAULT_SETTINGS, quoteValidityText } from '@/lib/calculations'
import { getQuoteItems } from '@/lib/quote-items'
import type { QuoteItem } from '@/lib/quote-items'
import type { QuoteInputs, Settings, PriceOption, BookingType } from '@/types/quote'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_ADDRESS = 'Ward Smith Entertainment <onboarding@resend.dev>'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wse.vercel.app'

function fmt(n: number) {
  return `£${Math.round(n).toLocaleString('en-GB')}`
}

function renderItemHtml(item: QuoteItem): string {
  return item.text
    + (item.link ? `<a href="${item.link.href}" style="color:#059669;">${item.link.text}</a>` : '')
    + (item.linkSuffix ?? '')
}

function buildEmailHtml(inputs: QuoteInputs, priceOptions: PriceOption[], quoteId: string, paEngineerRate = 0): string {
  const quoteUrl = `${BASE_URL}/quote/${quoteId}`

  const eventDate = inputs.event_date
    ? new Date(inputs.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const activeBookingTypes = (inputs.booking_types?.length ? inputs.booking_types : (inputs.booking_type ? [inputs.booking_type] : [])) as BookingType[]
  const primaryBt: BookingType = activeBookingTypes[0] ?? 'background'
  const { inclusions, requirements } = getQuoteItems(inputs, primaryBt, activeBookingTypes, priceOptions, paEngineerRate)

  // Group price options by band size
  const bySize = new Map<string, PriceOption[]>()
  for (const opt of priceOptions) {
    const key = opt.line_up || opt.band_size
    if (!bySize.has(key)) bySize.set(key, [])
    bySize.get(key)!.push(opt)
  }

  const addOnRows = (inputs.selected_add_ons ?? []).map(a => `
    <tr>
      <td style="padding:6px 12px;font-size:13px;color:#374151;">${a.line_item_label}</td>
      <td style="padding:6px 12px;font-size:13px;color:#374151;text-align:right;"></td>
    </tr>`).join('')

  const priceRows = Array.from(bySize.entries()).map(([lineup, opts]) => {
    const optRows = opts.map(o => `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#374151;padding-left:24px;">${o.set_config.replace('x', '×')} min sets</td>
        <td style="padding:8px 12px;font-size:14px;font-weight:600;color:#111827;text-align:right;">${fmt(o.total_price)}</td>
      </tr>`).join('')
    return `
      <tr>
        <td colspan="2" style="padding:10px 12px 4px;font-size:14px;font-weight:600;color:#111827;border-top:1px solid #e5e7eb;">${lineup}</td>
      </tr>
      ${optRows}`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">

    <!-- Header -->
    <div style="background:#111827;padding:28px 32px;">
      <div style="font-size:11px;font-weight:500;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">
        Ward Smith Entertainment
      </div>
      <div style="font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">
        ${inputs.agency_name ? `Quote for ${inputs.agency_name}` : 'Your quote'}
      </div>
      ${eventDate ? `<div style="font-size:13px;color:#9ca3af;margin-top:4px;">${eventDate}</div>` : ''}
      ${inputs.start_time ? `<div style="font-size:13px;color:#9ca3af;">${inputs.start_time}${inputs.finish_time ? `–${inputs.finish_time}` : ''}</div>` : ''}
    </div>

    <!-- Price options -->
    <div style="padding:24px 32px 0;">
      <div style="font-size:11px;font-weight:500;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">
        Pricing options
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        ${priceRows}
        ${addOnRows}
      </table>
    </div>

    ${(inputs.selected_add_ons ?? []).length > 0 ? `
    <div style="padding:12px 32px 0;">
      <div style="font-size:11px;color:#9ca3af;">* Performance fee only. Add-ons priced separately on request.</div>
    </div>` : ''}

    <!-- Inclusions -->
    <div style="padding:24px 32px 0;">
      <div style="font-size:11px;font-weight:500;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">
        What&rsquo;s included
      </div>
      <ul style="margin:0;padding:0;list-style:none;">
        ${inclusions.filter(i => i.show).map(i => `
        <li style="display:flex;gap:10px;padding:5px 0;font-size:13px;color:#374151;line-height:1.5;">
          <span style="color:#059669;flex-shrink:0;">&#10003;</span>
          <span>${renderItemHtml(i)}</span>
        </li>`).join('')}
        ${(inputs.selected_add_ons ?? []).filter(a => a.inclusion_text).map(a => `
        <li style="display:flex;gap:10px;padding:5px 0;font-size:13px;color:#374151;line-height:1.5;">
          <span style="color:#059669;flex-shrink:0;">&#10003;</span>
          <span>${a.inclusion_text}</span>
        </li>`).join('')}
      </ul>
    </div>

    <!-- Requirements -->
    <div style="padding:24px 32px 0;">
      <div style="font-size:11px;font-weight:500;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">
        Requirements
      </div>
      <ul style="margin:0;padding:0;list-style:none;">
        ${requirements.filter(r => r.show).map(r => `
        <li style="display:flex;gap:10px;padding:5px 0;font-size:13px;color:#374151;line-height:1.5;">
          <span style="color:#9ca3af;flex-shrink:0;">&middot;</span>
          <span>${renderItemHtml(r)}</span>
        </li>`).join('')}
        ${(inputs.selected_add_ons ?? []).filter(a => a.requirement_text).map(a => `
        <li style="display:flex;gap:10px;padding:5px 0;font-size:13px;color:#374151;line-height:1.5;">
          <span style="color:#9ca3af;flex-shrink:0;">&middot;</span>
          <span>${a.requirement_text}</span>
        </li>`).join('')}
      </ul>
    </div>

    <!-- View online link -->
    <div style="padding:28px 32px;">
      <a href="${quoteUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:13px;font-weight:500;letter-spacing:-0.01em;">
        View full quote online &rarr;
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">
        ${quoteValidityText(inputs.event_date, inputs.travel_type === 'international')} Ward Smith Entertainment &mdash; wardsmithentertainment.com
      </p>
      ${inputs.agent_name ? `<p style="margin:6px 0 0;font-size:11px;color:#9ca3af;">Prepared by ${inputs.agent_name}</p>` : ''}
    </div>

  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const { inputs }: { inputs: QuoteInputs } = await req.json()

    if (!inputs.client_email) {
      return NextResponse.json({ error: 'client_email is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch current settings
    const { data: settingsRow } = await supabase.from('settings').select('*').eq('id', 1).single()
    const settings: Settings = { ...DEFAULT_SETTINGS, ...settingsRow }

    // Calculate and save quote
    const calculated = calculate(inputs, settings)
    const { data: q, error: dbErr } = await supabase
      .from('quotes')
      .insert({ inputs, calculated, settings_snapshot: settings })
      .select('id')
      .single()

    if (dbErr || !q?.id) throw dbErr ?? new Error('No quote ID returned')

    // Send email
    const emailHtml = buildEmailHtml(inputs, calculated.price_options ?? [], q.id, settings.pa_sound_engineer_rate)

    const { error: emailErr } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: inputs.client_email,
      subject: `Your quote — Ward Smith Entertainment${inputs.event_date ? ` · ${new Date(inputs.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}` : ''}`,
      html: emailHtml,
    })

    if (emailErr) {
      console.error('Email send error:', emailErr)
      // Quote is saved — return ID even if email fails
      return NextResponse.json({ id: q.id, emailError: String(emailErr) }, { status: 207 })
    }

    return NextResponse.json({ id: q.id })
  } catch (err) {
    console.error('Send quote error:', err)
    return NextResponse.json({ error: 'Failed to send quote' }, { status: 500 })
  }
}
