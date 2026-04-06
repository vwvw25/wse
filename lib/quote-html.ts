import type { QuoteRecord, BookingType } from '@/types/quote'
import { BAND_SIZE_LABELS } from '@/lib/lineups'

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

function autoArrivalTime(start: string | null): string | null {
  if (!start) return null
  const [h, m] = start.split(':').map(Number)
  const mins = h * 60 + m - 60
  const hh = Math.floor(((mins % 1440) + 1440) % 1440 / 60)
  const mm = ((mins % 1440) + 1440) % 1440 % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// Generates the quote body as an HTML string — same content as /quote/[id]/text
export function generateQuoteHtml(quote: QuoteRecord): string {
  const { inputs, calculated } = quote

  const isInternational = inputs.travel_type === 'international'
  const isDomesticOvernight = inputs.travel_type === 'domestic_overnight' || isInternational
  const hasBuyout = (inputs.selected_add_ons ?? []).some(a => a.name.toLowerCase().includes('buyout'))
  const hasMicHire = (inputs.selected_add_ons ?? []).some(a => a.name.toLowerCase().includes('mic hire'))
  const loadOutDiffersFromFinish = !!inputs.load_out_time && !!inputs.finish_time && inputs.load_out_time !== inputs.finish_time
  const isCustomArrival = inputs.is_custom_arrival_time === true
    || (inputs.is_custom_arrival_time == null && !!inputs.arrival_time && inputs.arrival_time !== autoArrivalTime(inputs.start_time))
  const showSpecificTimes = isCustomArrival || loadOutDiffersFromFinish

  const eventDate = inputs.event_date
    ? new Date(inputs.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const options = calculated.price_options ?? []
  const bookingTypes = (inputs.booking_types?.length
    ? inputs.booking_types
    : (inputs.booking_type ? [inputs.booking_type] : [])) as BookingType[]
  const hasMultipleTypes = bookingTypes.length > 1

  const HR = `<hr style="border:none;border-top:1px solid #ccc;margin:24px 0;">`

  let html = `<div style="font-family:Georgia,serif;font-size:15px;color:#111;line-height:1.6;">`

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
  html += HR

  for (let index = 0; index < bookingTypes.length; index++) {
    const bt = bookingTypes[index]
    const btOptions = options.filter(o => (o.booking_type ?? 'background') === bt)
    if (btOptions.length === 0) continue

    const hasExtendedPaEngineer = btOptions.some(o => o.has_extended_pa_engineer)
    const btBandType = (inputs.band_types_by_type as Record<string, string> | undefined)?.[bt] ?? inputs.band_type ?? 'electric'
    const isRoaming = btBandType === 'roaming'
    const showIpadMusic = !inputs.is_acoustic && !isRoaming
      && !(inputs.selected_add_ons ?? []).some(a => a.name === 'Roaming set')

    if (hasMultipleTypes && index > 0) html += HR
    if (hasMultipleTypes) {
      html += `<p style="margin:0 0 16px;font-weight:bold;font-size:16px;">${BOOKING_TYPE_LABELS[bt] ?? bt}</p>`
    }
    if (bt === 'background') {
      html += `<p style="margin:0 0 8px;color:#555;">Suitable for events looking for background music, without a dance floor, where dancing isn't a key part of the event.</p>`
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

    // Inclusions
    const inclusions: { text: string; show: boolean }[] = [
      { text: 'Background PA', show: !hasExtendedPaEngineer },
      { text: 'Extended PA + sound engineer', show: hasExtendedPaEngineer },
      { text: 'Based on a finish of 11pm or earlier', show: !inputs.finish_time },
      { text: 'Music via iPad/PA during intervals', show: showIpadMusic },
      { text: 'Arrival one hour before performance start (1.5hrs if Extended PA + sound engineer)', show: !showSpecificTimes },
      { text: `Arrival: ${inputs.arrival_time}`, show: isCustomArrival && !!inputs.arrival_time },
      { text: `Start: ${inputs.start_time}`, show: showSpecificTimes && !!inputs.start_time },
      { text: `Finish: ${inputs.finish_time}`, show: showSpecificTimes && !!inputs.finish_time },
      { text: `Load out: ${inputs.load_out_time}`, show: loadOutDiffersFromFinish && !!inputs.load_out_time },
      { text: 'Petrol / train travel', show: isDomesticOvernight && (inputs.petrol_train_cost ?? 0) > 0 },
      { text: `Accommodation (${inputs.accommodation_nights ?? 1} night${(inputs.accommodation_nights ?? 1) !== 1 ? 's' : ''})`, show: isDomesticOvernight && (inputs.accommodation_cost ?? 0) > 0 },
      { text: 'Per diem', show: isDomesticOvernight && (inputs.per_diem_rate ?? 0) > 0 },
      { text: 'Flights', show: isInternational },
      { text: 'Airport transfers', show: isInternational && ((inputs.outgoing_uk_transfer_cost ?? 0) + (inputs.outgoing_dest_transfer_cost ?? 0)) > 0 },
      { text: 'Local transport', show: isInternational && (inputs.local_transport_cost ?? 0) > 0 },
      { text: 'Visa costs', show: isInternational && (inputs.visa_cost ?? 0) > 0 },
      { text: 'Does not include client use of mic — please book mic hire option if any use of mic is required', show: !hasMicHire },
      { text: 'Includes mic hire for use during agreed performance times (i.e. not during break)', show: hasMicHire },
    ]
    const activeInclusions = inclusions.filter(i => i.show)
    const addonInclusions = (inputs.selected_add_ons ?? []).filter(a => a.inclusion_text)

    html += `<p style="margin:0 0 8px;font-weight:bold;">What's included</p>`
    html += `<ul style="margin:0 0 16px;padding-left:0;list-style:none;">`
    activeInclusions.forEach(item => { html += `<li style="margin-bottom:4px;">– ${item.text}</li>` })
    addonInclusions.forEach(addon => { html += `<li style="margin-bottom:4px;">– ${addon.inclusion_text}</li>` })
    html += `</ul>`

    // Requirements
    const requirements: { text: string; show: boolean }[] = [
      { text: '2 x 13amp plug sockets (although powerless set-ups can be provided — please ask for a quote)', show: !inputs.is_powerless && !inputs.is_acoustic },
      { text: 'For bookings of 2×45 or more the following needs to be stated on the contract: same main choices as guests, choice from a menu or a buyout of £20 per performer', show: !hasBuyout },
      { text: 'A lockable, indoor green room that is exclusive to the band and not shared with any other artists, suppliers or staff', show: true },
      { text: 'Soft drinks and mineral water', show: true },
      { text: 'Being able to pack down/load out at the end of the final set', show: !loadOutDiffersFromFinish },
      { text: 'Full loading information required 2 weeks in advance', show: true },
      { text: 'Based on being able to park within 25 metres of an entrance to load. Please advise of any loading restrictions at the venue', show: true },
      { text: "If the venue isn't easily accessible by car then this may impact the quote and the equipment we're able to supply", show: true },
      { text: 'Client to hire drum kit locally', show: isInternational && (inputs.drummer_fee ?? 0) > 0 },
      { text: 'Client to provide keyboard or piano on-site', show: (inputs.keys_fee ?? 0) > 0 && isInternational },
    ]
    const activeRequirements = requirements.filter(r => r.show)
    const addonRequirements = (inputs.selected_add_ons ?? []).filter(a => a.requirement_text)

    html += `<p style="margin:0 0 8px;font-weight:bold;">Requirements</p>`
    html += `<ul style="margin:0 0 16px;padding-left:0;list-style:none;">`
    activeRequirements.forEach(item => { html += `<li style="margin-bottom:4px;">– ${item.text}</li>` })
    addonRequirements.forEach(addon => { html += `<li style="margin-bottom:4px;">– ${addon.requirement_text}</li>` })
    html += `</ul>`
  }

  html += HR
  html += `<p style="margin:0 0 8px;">If you need any changes or additional requests, just drop us an email so we can make arrangements to accommodate them. Any changes made during checking-off or contracts need to be agreed by email first.</p>`
  html += `<p style="margin:0 0 8px;">If you'd like to chat or have any questions please feel free to drop me a line, WhatsApp or text on 07734652303 or drop me an email.</p>`
  html += `<p style="margin:24px 0 0;color:#555;">This quote is valid for 30 days. Ward Smith Entertainment — wardsmithentertainment.com</p>`
  html += `</div>`

  return html
}
