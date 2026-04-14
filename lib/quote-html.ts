import type { QuoteRecord, BookingType } from '@/types/quote'
import { BAND_SIZE_LABELS } from '@/lib/lineups'
import { quoteValidityText } from '@/lib/calculations'
import { getQuoteItems } from '@/lib/quote-items'
import type { QuoteItem } from '@/lib/quote-items'

const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  background: 'Background',
  dancing_under_40: 'Dancing — fewer than 40 guests',
  dancing_over_40: 'Dancing — more than 40 guests',
  wedding: 'Wedding',
}

function formatSetConfig(cfg: string): string {
  if (cfg === '3x45') return '3×45 (or 2×60)'
  return cfg.replace('x', '×')
}

const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

function renderItemHtml(item: QuoteItem): string {
  return item.text
    + (item.link ? `<a href="${item.link.href}">${item.link.text}</a>` : '')
    + (item.linkSuffix ?? '')
}

// Generates the quote body as an HTML string — same content as /quote/[id]/text
export function generateQuoteHtml(quote: QuoteRecord): string {
  const { inputs, calculated } = quote

  const isInternational = inputs.travel_type === 'international'

  const eventDate = inputs.event_date
    ? new Date(inputs.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const options = calculated.price_options ?? []
  const bookingTypes = (inputs.booking_types?.length
    ? inputs.booking_types
    : (inputs.booking_type ? [inputs.booking_type] : [])) as BookingType[]
  const hasMultipleTypes = bookingTypes.length > 1

  const HR = `<hr style="border:none;border-top:1px solid #ccc;margin:24px 0;">`

  let html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;line-height:1.6;">`

  // Header
  html += `<p style="margin:0 0 8px;"><strong>Ward Smith Entertainment</strong></p>`
  if (inputs.agent_name || inputs.agency_name) {
    const who = inputs.agent_name && inputs.agency_name
      ? `${inputs.agent_name} at ${inputs.agency_name}`
      : inputs.agent_name ?? inputs.agency_name
    html += `<p style="margin:0 0 8px;">For <strong>${who}</strong></p>`
  }
  if (eventDate) html += `<p style="margin:0 0 8px;">Date: ${eventDate}</p>`
  if (inputs.venue_name) html += `<p style="margin:0 0 8px;">Venue: ${inputs.venue_name}</p>`

  // Booking details
  const hasBookingDetails = inputs.location || inputs.start_time || inputs.finish_time || inputs.band_size_requested || inputs.sets_requested || inputs.client_provides_pa
  if (hasBookingDetails) {
    html += HR
    html += `<p style="margin:0 0 8px;font-weight:bold;">Booking details</p>`
    html += `<table style="width:100%;border-collapse:collapse;margin:8px 0 0;"><tbody>`
    if (inputs.client_provides_pa) html += `<tr><td style="padding:4px 8px 4px 0;border-bottom:1px solid #ccc;font-weight:500;width:160px;">PA</td><td style="padding:4px 8px 4px 0;border-bottom:1px solid #ccc;">Client providing PA</td></tr>`
    if (inputs.location) html += `<tr><td style="padding:4px 8px 4px 0;border-bottom:1px solid #ccc;font-weight:500;width:160px;">Location</td><td style="padding:4px 8px 4px 0;border-bottom:1px solid #ccc;">${inputs.location}</td></tr>`
    if (inputs.start_time) html += `<tr><td style="padding:4px 8px 4px 0;border-bottom:1px solid #ccc;font-weight:500;">Start time</td><td style="padding:4px 8px 4px 0;border-bottom:1px solid #ccc;">${inputs.start_time}</td></tr>`
    if (inputs.finish_time) html += `<tr><td style="padding:4px 8px 4px 0;border-bottom:1px solid #ccc;font-weight:500;">Finish time</td><td style="padding:4px 8px 4px 0;border-bottom:1px solid #ccc;">${inputs.finish_time}</td></tr>`
    if (inputs.band_size_requested) html += `<tr><td style="padding:4px 8px 4px 0;border-bottom:1px solid #ccc;font-weight:500;">Band size</td><td style="padding:4px 8px 4px 0;border-bottom:1px solid #ccc;">${inputs.band_size_requested}</td></tr>`
    if (inputs.sets_requested) html += `<tr><td style="padding:4px 0;border-bottom:1px solid #ccc;font-weight:500;">Sets</td><td style="padding:4px 0;border-bottom:1px solid #ccc;">${inputs.sets_requested}</td></tr>`
    html += `</tbody></table>`
  }

  html += HR

  for (let index = 0; index < bookingTypes.length; index++) {
    const bt = bookingTypes[index]
    const btOptions = options.filter(o => (o.booking_type ?? 'background') === bt)
    if (btOptions.length === 0) continue

    const paEngineerRate = quote.settings_snapshot?.pa_sound_engineer_rate ?? 0
    const { inclusions, requirements } = getQuoteItems(inputs, bt, bookingTypes, btOptions, paEngineerRate)
    const addonInclusions = (inputs.selected_add_ons ?? []).filter(a => a.inclusion_text)
    const addonRequirements = (inputs.selected_add_ons ?? []).filter(a => a.requirement_text)

    if (hasMultipleTypes && index > 0) html += HR
    if (hasMultipleTypes && bt !== 'background') {
      html += `<p style="margin:0 0 16px;font-weight:bold;font-size:16px;">${BOOKING_TYPE_LABELS[bt] ?? bt}</p>`
    }

    // Price table
    const sizes = Array.from(new Set(btOptions.map(o => o.band_size)))
    html += `<table style="width:100%;border-collapse:collapse;margin:12px 0 16px;">`
    html += `<thead><tr>`
    html += `<th style="text-align:left;border-bottom:1px solid #000;padding:4px 8px 4px 0;font-weight:bold;">Line-up</th>`
    html += `<th style="text-align:left;border-bottom:1px solid #000;padding:4px 8px 4px 0;font-weight:bold;">Sets</th>`
    html += `<th style="text-align:right;border-bottom:1px solid #000;padding:4px 8px 4px 0;font-weight:bold;">Total</th>`
    html += `</tr></thead><tbody>`
    for (const size of sizes) {
      const sizeOpts = btOptions.filter(o => o.band_size === size)
      sizeOpts.forEach((opt, i) => {
        html += `<tr>`
        html += `<td style="padding:4px 8px 4px 0;border-bottom:1px solid #ccc;vertical-align:top;">${i === 0 ? `${BAND_SIZE_LABELS[size] ?? size} (${opt.line_up}${opt.has_extended_pa_engineer ? ' + Sound engineer' : ''})` : ''}</td>`
        html += `<td style="padding:4px 8px 4px 0;border-bottom:1px solid #ccc;vertical-align:top;">${formatSetConfig(opt.set_config)}</td>`
        html += `<td style="padding:4px 0;border-bottom:1px solid #ccc;vertical-align:top;text-align:right;white-space:nowrap;"><strong>${fmt(opt.total_price)}</strong></td>`
        html += `</tr>`
      })
    }
    html += `</tbody></table>`

    html += `<p style="margin:0 0 8px;font-weight:bold;">What's included</p>`
    html += `<ul style="margin:0 0 16px;padding-left:0;list-style:none;">`
    inclusions.filter(i => i.show).forEach(item => { html += `<li style="margin-bottom:4px;">– ${renderItemHtml(item)}</li>` })
    addonInclusions.forEach(addon => { html += `<li style="margin-bottom:4px;">– ${addon.inclusion_text}</li>` })
    html += `</ul>`

    html += `<p style="margin:0 0 8px;font-weight:bold;">Requirements</p>`
    html += `<ul style="margin:0 0 16px;padding-left:0;list-style:none;">`
    requirements.filter(r => r.show).forEach(item => { html += `<li style="margin-bottom:4px;">– ${renderItemHtml(item)}</li>` })
    addonRequirements.forEach(addon => { html += `<li style="margin-bottom:4px;">– ${addon.requirement_text}</li>` })
    html += `</ul>`
  }

  html += HR
  html += `<p style="margin:0 0 8px;">If you need any changes or additional requests, just drop us an email so we can make arrangements to accommodate them. Any changes needed during checking-off or contracts stages must be agreed by email first. ${quoteValidityText(inputs.event_date, isInternational)}</p>`
  html += `</div>`

  return html
}
