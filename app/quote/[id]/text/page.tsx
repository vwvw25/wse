import React from 'react'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import type { QuoteRecord, BookingType } from '@/types/quote'
import { quoteValidityText } from '@/lib/calculations'
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

export default async function QuoteTextPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('quotes').select('*').eq('id', id).single()
  if (error || !data) notFound()

  const quote = data as QuoteRecord
  const { inputs, calculated } = quote

  const isInternational = inputs.travel_type === 'international'
  const isDomesticOvernight = inputs.travel_type === 'domestic_overnight' || isInternational
  const hasBuyout = (inputs.selected_add_ons ?? []).some(a => a.name.toLowerCase().includes('buyout'))
  const hasMicHire = (inputs.selected_add_ons ?? []).some(a => a.name.toLowerCase().includes('mic hire'))
  const loadOutDiffersFromFinish = !!inputs.load_out_time && !!inputs.finish_time && inputs.load_out_time !== inputs.finish_time

  function autoArrivalTime(start: string | null): string | null {
    if (!start) return null
    const [h, m] = start.split(':').map(Number)
    const mins = h * 60 + m - 60
    const hh = Math.floor(((mins % 1440) + 1440) % 1440 / 60)
    const mm = ((mins % 1440) + 1440) % 1440 % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
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

  const p: React.CSSProperties = { margin: '0 0 8px', lineHeight: 1.6 }
  const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', margin: '12px 0 16px' }
  const th: React.CSSProperties = { textAlign: 'left', borderBottom: '1px solid #000', padding: '4px 8px 4px 0', fontWeight: 'bold' }
  const td: React.CSSProperties = { padding: '4px 8px 4px 0', borderBottom: '1px solid #ccc', verticalAlign: 'top' }
  const tdRight: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' }
  const hr: React.CSSProperties = { border: 'none', borderTop: '1px solid #ccc', margin: '24px 0' }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 32px', fontFamily: 'Georgia, serif', fontSize: 15, color: '#111', lineHeight: 1.6, background: '#fff' }}>

      {/* Back link */}
      <div style={{ marginBottom: 32, fontFamily: 'Arial, sans-serif', fontSize: 13 }}>
        <a href={`/quote/${id}`} style={{ color: '#555', textDecoration: 'none' }}>← Back to quote</a>
      </div>

      {/* Header */}
      <p style={p}><strong>Ward Smith Entertainment</strong></p>
      {(inputs.agent_name || inputs.agency_name) && (
        <p style={p}>
          For <strong>
            {inputs.agent_name && inputs.agency_name
              ? `${inputs.agent_name} at ${inputs.agency_name}`
              : inputs.agent_name ?? inputs.agency_name}
          </strong>
        </p>
      )}
      {eventDate && <p style={p}>Date: {eventDate}</p>}
      {inputs.venue_name && <p style={p}>Venue: {inputs.venue_name}</p>}

      {/* Booking details — only fields not already in the header */}
      {(inputs.location || inputs.start_time || inputs.finish_time || inputs.band_size_requested || inputs.sets_requested || inputs.client_provides_pa) && (
        <>
          <div style={hr} />
          <p style={{ ...p, fontWeight: 'bold' }}>Booking details</p>
          <table style={{ ...tbl, margin: '8px 0 0' }}>
            <tbody>
              {inputs.client_provides_pa && <tr><td style={{ ...td, fontWeight: 500, width: 160 }}>PA</td><td style={td}>Client providing PA</td></tr>}
              {inputs.location && <tr><td style={{ ...td, fontWeight: 500, width: 160 }}>Location</td><td style={td}>{inputs.location}</td></tr>}
              {inputs.start_time && <tr><td style={{ ...td, fontWeight: 500 }}>Start time</td><td style={td}>{inputs.start_time}</td></tr>}
              {inputs.finish_time && <tr><td style={{ ...td, fontWeight: 500 }}>Finish time</td><td style={td}>{inputs.finish_time}</td></tr>}
              {inputs.band_size_requested && <tr><td style={{ ...td, fontWeight: 500 }}>Band size</td><td style={td}>{inputs.band_size_requested}</td></tr>}
              {inputs.sets_requested && <tr><td style={{ ...td, fontWeight: 500 }}>Sets</td><td style={td}>{inputs.sets_requested}</td></tr>}
            </tbody>
          </table>
        </>
      )}

      <div style={hr} />

      {bookingTypes.map((bt, index) => {
        const btOptions = options.filter(o => (o.booking_type ?? 'background') === bt)
        if (btOptions.length === 0) return null

        const hasExtendedPaEngineer = btOptions.some(o => o.has_extended_pa_engineer)
        const btBandType = (inputs.band_types_by_type as Record<string, string> | undefined)?.[bt] ?? inputs.band_type ?? 'electric'
        const isRoaming = btBandType === 'roaming'
        const showIpadMusic = !inputs.is_acoustic && !isRoaming && !inputs.client_provides_pa
          && !(inputs.selected_add_ons ?? []).some(a => a.name === 'Roaming set')

        const inclusions: { text: string; show: boolean }[] = [
          { text: 'Background PA', show: !hasExtendedPaEngineer && !inputs.client_provides_pa && (bt === 'background' || bt === 'dancing_under_40') },
          { text: 'Extended PA + sound engineer', show: hasExtendedPaEngineer },
          { text: 'Based on a finish of 11pm or earlier', show: !inputs.finish_time },
          { text: 'Music via iPad/PA during intervals', show: showIpadMusic },
          { text: 'Arrival one hour before performance start (1.5hrs if Extended PA + sound engineer)', show: !showSpecificTimes },
          { text: `Arrival: ${inputs.arrival_time}`, show: isCustomArrival && !!inputs.arrival_time },
          { text: `Start: ${inputs.start_time}`, show: !!inputs.start_time },
          { text: `Finish: ${inputs.finish_time}`, show: !!inputs.finish_time },
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

        const requirements: { text: string; show: boolean }[] = [
          { text: '2 x 13amp plug sockets (although powerless set-ups can be provided — please ask for a quote)', show: !inputs.is_powerless && !inputs.is_acoustic },
          { text: 'For bookings of 2×45 or more the following needs to be stated on the contract: same main choices as guests, choice from a menu or a buyout of £20 per performer', show: !hasBuyout },
          { text: 'A lockable, indoor green room that is exclusive to the band and not shared with any other artists, suppliers or staff', show: true },
          { text: 'Soft drinks and mineral water', show: true },
          { text: 'Being able to pack down/load out at the end of the final set', show: !loadOutDiffersFromFinish },
          { text: 'Full loading information required 2 weeks in advance', show: true },
          { text: 'Based on being able to park within 25 metres of an entrance to load. Please advise of any loading restrictions at the venue', show: true },
          { text: "If the venue isn't easily accessible by car then this may impact the quote and the equipment we're able to supply", show: true },
          { text: 'Client to hire drum kit locally if drummer is booked', show: isInternational && (inputs.drummer_fee ?? 0) > 0 },
          { text: 'Client to provide keyboard or piano on-site if pianist is booked', show: (inputs.keys_fee ?? 0) > 0 && isInternational },
          { text: 'Client to provide double bass on site if upright double bass is booked (alternatively bassist can bring electric bass)', show: isInternational && (inputs.bass_fee ?? 0) > 0 && ['roaming', 'jazz_keys', 'jazz_guitar'].includes(btBandType) },
        ]

        const activeInclusions = inclusions.filter(i => i.show)
        const addonInclusions = (inputs.selected_add_ons ?? []).filter(a => a.inclusion_text)
        const activeRequirements = requirements.filter(r => r.show)
        const addonRequirements = (inputs.selected_add_ons ?? []).filter(a => a.requirement_text)

        // Group options by band size for the table
        const sizes = Array.from(new Set(btOptions.map(o => o.band_size)))

        return (
          <div key={bt}>
            {hasMultipleTypes && index > 0 && <div style={hr} />}

            {hasMultipleTypes && (
              <p style={{ ...p, fontWeight: 'bold', fontSize: 16, marginBottom: 16 }}>
                {BOOKING_TYPE_LABELS[bt] ?? bt}
              </p>
            )}

            {bt === 'background' && (
              <p style={{ ...p, color: '#555' }}>
                Suitable for events looking for background music, without a dance floor, where dancing isn't a key part of the event.
              </p>
            )}

            {/* Price table */}
            <table style={tbl}>
              <thead>
                <tr>
                  <th style={th}>Line-up</th>
                  <th style={th}>Sets</th>
                  <th style={{ ...th, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sizes.map(size => {
                  const sizeOpts = btOptions.filter(o => o.band_size === size)
                  return sizeOpts.map((opt, i) => (
                    <tr key={`${size}-${opt.set_config}`}>
                      <td style={td}>
                        {i === 0 ? `${BAND_SIZE_LABELS[size] ?? size} (${opt.line_up}${opt.has_extended_pa_engineer ? ' + Sound engineer' : ''})` : ''}
                      </td>
                      <td style={td}>{formatSetConfig(opt.set_config)}</td>
                      <td style={tdRight}><strong>{fmt(opt.total_price)}</strong></td>
                    </tr>
                  ))
                })}
              </tbody>
            </table>

            {/* What's included */}
            <p style={{ ...p, fontWeight: 'bold' }}>What&apos;s included</p>
            <ul style={{ margin: '0 0 16px', paddingLeft: 0, listStyle: 'none' }}>
              {activeInclusions.map(item => <li key={item.text} style={{ marginBottom: 4 }}>– {item.text}</li>)}
              {addonInclusions.map(addon => <li key={addon.id} style={{ marginBottom: 4 }}>– {addon.inclusion_text}</li>)}
            </ul>

            {/* Requirements */}
            <p style={{ ...p, fontWeight: 'bold' }}>Requirements</p>
            <ul style={{ margin: '0 0 16px', paddingLeft: 0, listStyle: 'none' }}>
              {(isInternational || inputs.client_provides_pa) && (
                <li style={{ marginBottom: 4 }}>– Client to provide full rider (for riders please see <a href="https://drive.google.com/drive/folders/1906sIEkcO5GTmLH395oRJuy6xtERE2QZ?usp=sharing" target="_blank" rel="noopener noreferrer">this folder</a>)</li>
              )}
              {activeRequirements.map(item => <li key={item.text} style={{ marginBottom: 4 }}>– {item.text}</li>)}
              {addonRequirements.map(addon => <li key={addon.id} style={{ marginBottom: 4 }}>– {addon.requirement_text}</li>)}
            </ul>
          </div>
        )
      })}

      <div style={hr} />

      <p style={p}>If you need any changes or additional requests, just drop us an email so we can make arrangements to accommodate them. Any changes needed during checking-off or contracts stages must be agreed by email first. {quoteValidityText(inputs.event_date, isInternational)}</p>
    </div>
  )
}
