import React from 'react'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import type { QuoteRecord, BookingType } from '@/types/quote'
import { quoteValidityText } from '@/lib/calculations'
import { getQuoteItems, autoArrivalTime } from '@/lib/quote-items'
import type { QuoteItem } from '@/lib/quote-items'
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

const STANDARD_OVER_HOURS: Record<string, string> = {
  '2x45': 'up to 3 hours',
  '3x45': 'up to 4 hours',
  '4x45': 'up to 6 hours',
  '5x45': 'up to 8 hours',
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

        const paEngineerRate = quote.settings_snapshot?.pa_sound_engineer_rate ?? 0
        const { inclusions, requirements } = getQuoteItems(inputs, bt, bookingTypes, btOptions, paEngineerRate)
        const addonInclusions = (inputs.selected_add_ons ?? []).filter(a => a.inclusion_text)
        const addonRequirements = (inputs.selected_add_ons ?? []).filter(a => a.requirement_text)
        const sizes = Array.from(new Set(btOptions.map(o => o.band_size)))
        const showDual = !!inputs.give_custom_and_standard && btOptions.some(o => o.waiting_cost > 0)

        const renderItem = (item: QuoteItem) => (
          <>{item.text}{item.link && <a href={item.link.href} target="_blank" rel="noopener noreferrer">{item.link.text}</a>}{item.linkSuffix}</>
        )

        const renderPriceTable = (useStandard = false) => (
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
                  <tr key={`${size}-${opt.set_config}-${useStandard}`}>
                    <td style={td}>
                      {i === 0 ? `${BAND_SIZE_LABELS[size] ?? size} (${opt.line_up}${opt.has_extended_pa_engineer ? ' + Sound engineer' : ''})` : ''}
                    </td>
                    <td style={td}>
                      {useStandard
                        ? `${formatSetConfig(opt.set_config)} over ${STANDARD_OVER_HOURS[opt.set_config] ?? ''}`
                        : formatSetConfig(opt.set_config)}
                    </td>
                    <td style={tdRight}>
                      <strong>{fmt(useStandard ? opt.standard_total_price : opt.total_price)}</strong>
                    </td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
        )

        return (
          <div key={bt}>
            {hasMultipleTypes && index > 0 && <div style={hr} />}

            {hasMultipleTypes && bt !== 'background' && (
              <p style={{ ...p, fontWeight: 'bold', fontSize: 16, marginBottom: 16 }}>
                {BOOKING_TYPE_LABELS[bt] ?? bt}
              </p>
            )}

            {showDual ? (
              <>
                <p style={{ ...p, fontWeight: 'bold', marginBottom: 4 }}>Based on your timings</p>
                {renderPriceTable(false)}
                <p style={{ ...p, fontWeight: 'bold', marginBottom: 4, marginTop: 16 }}>Standard packages</p>
                {renderPriceTable(true)}
              </>
            ) : renderPriceTable(false)}

            {/* What's included */}
            <p style={{ ...p, fontWeight: 'bold' }}>What&apos;s included</p>
            <ul style={{ margin: '0 0 16px', paddingLeft: 0, listStyle: 'none' }}>
              {inclusions.filter(i => i.show).map((item, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>– {renderItem(item)}</li>
              ))}
              {addonInclusions.map(addon => <li key={addon.id} style={{ marginBottom: 4 }}>– {addon.inclusion_text}</li>)}
            </ul>

            {/* Requirements */}
            <p style={{ ...p, fontWeight: 'bold' }}>Requirements</p>
            <ul style={{ margin: '0 0 16px', paddingLeft: 0, listStyle: 'none' }}>
              {requirements.filter(r => r.show).map((item, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>– {renderItem(item)}</li>
              ))}
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
