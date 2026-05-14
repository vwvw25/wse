import React from 'react'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { calculate, DEFAULT_SETTINGS, quoteValidityText } from '@/lib/calculations'
import { getQuoteItems, autoArrivalTime } from '@/lib/quote-items'
import type { QuoteItem } from '@/lib/quote-items'
import type { QuoteRecord, PriceOption, BookingType, Settings } from '@/types/quote'
import AuditButton from './AuditButton'
import NewVersionButton from './NewVersionButton'
import { BAND_SIZE_LABELS, BAND_TYPE_LABELS } from '@/lib/lineups'

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

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('quotes')
    .select('*, event:events(location, venue_name, venue_address, arrival_time, finish_time, load_out_time, guests, request_details)')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  type EventSnippet = {
    location?: string | null
    venue_name?: string | null
    venue_address?: string | null
    arrival_time?: string | null
    finish_time?: string | null
    load_out_time?: string | null
    guests?: number | null
    request_details?: {
      band_size_requested?: string | null
      sets_requested?: string | null
      special_requirements?: string | null
      sound_requirements?: string | null
      notes?: string | null
    } | null
  } | null

  const quote = data as QuoteRecord & { event?: EventSnippet; version?: number; status?: string; event_id?: string }
  const eventData = quote.event
  const rd = eventData?.request_details
  let { inputs, calculated } = quote

  // If stored prices are broken (null/NaN), recalculate and save
  const hasBrokenPrices = calculated.price_options?.some(o => o.total_price == null || isNaN(o.total_price))
  if (hasBrokenPrices) {
    const { data: settingsRow } = await supabase.from('settings').select('*').eq('id', 1).single()
    const settings: Settings = { ...DEFAULT_SETTINGS, ...(settingsRow ?? {}) }
    calculated = calculate(inputs, settings)
    // Save fixed calculated data back to DB silently
    await supabase.from('quotes').update({ calculated }).eq('id', id)
  }

  const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`
  const isInternational = inputs.travel_type === 'international'

  const eventDate = inputs.event_date
    ? new Date(inputs.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const options = calculated.price_options ?? []
  const bookingTypes = Array.from(new Set(options.map(o => o.booking_type ?? 'background'))) as BookingType[]
  const hasMultipleTypes = bookingTypes.length > 1

  const allBookingTypes = inputs.booking_types?.length
    ? inputs.booking_types
    : (inputs.booking_type ? [inputs.booking_type] : [])

  return (
    <div style={{ padding: '2.5rem 1rem', minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)' }}>
                {inputs.agent_name && inputs.agency_name
                  ? `For ${inputs.agent_name} at ${inputs.agency_name}`
                  : inputs.agent_name
                    ? `For ${inputs.agent_name}`
                    : inputs.agency_name
                      ? `For ${inputs.agency_name}`
                      : 'Quote'}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Ward Smith Entertainment</p>
              {eventDate && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{eventDate}</p>}
              {inputs.venue_name && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{inputs.venue_name}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {quote.version && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 4, background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }}>
                      v{quote.version}
                    </span>
                  )}
                  {quote.status && quote.status !== 'sent' && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 4, textTransform: 'capitalize',
                      ...(quote.status === 'accepted' ? { background: '#f0fdf4', color: '#16a34a', border: '0.5px solid #bbf7d0' }
                        : quote.status === 'superseded' ? { background: '#f9fafb', color: '#9ca3af', border: '0.5px solid #e5e7eb' }
                        : quote.status === 'draft' ? { background: '#f3f4f6', color: '#374151', border: '0.5px solid #e5e7eb' }
                        : {}),
                    }}>
                      {quote.status}
                    </span>
                  )}
                </div>
                <div>Ref: {id.slice(0, 8).toUpperCase()}</div>
                <div>{new Date(quote.created_at).toLocaleDateString('en-GB')}</div>
                {quote.event_id && (
                  <a href={`/admin/events/${quote.event_id}?tab=quotes`} style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
                    ← Back to event
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <a href={`/quote/builder?prefill=${id}`} style={headerBtnStyle}>Live builder →</a>
                {quote.event_id && quote.status !== 'superseded' ? (
                  <NewVersionButton quoteId={id} />
                ) : (
                  <a href={`/quote/new/details?edit=${id}`} style={headerBtnStyle}>Edit →</a>
                )}
                <a href={`/quote/new/details?prefill=${id}`} style={headerBtnStyle}>Duplicate →</a>
                <a href={`/quote/${id}/text`} style={headerBtnStyle}>Email version →</a>
                <a href={`/quote/${id}/email`} style={{ ...headerBtnStyle, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}>Send email →</a>
                <AuditButton calculated={calculated} inputs={inputs} settings={quote.settings_snapshot} />
              </div>
            </div>
          </div>
        </div>

        {/* Booking details */}
        <Card label="Booking details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            {allBookingTypes.length > 0 && (
              <Detail
                label="Booking type"
                value={allBookingTypes.map(t => BOOKING_TYPE_LABELS[t] ?? t.replace(/_/g, ' ')).join(', ')}
              />
            )}
            {(inputs.location || eventData?.location) && (
              <Detail label="Location" value={inputs.location || eventData?.location || ''} />
            )}
            {eventData?.venue_address && <Detail label="Address" value={eventData.venue_address} />}
            {eventData?.guests && <Detail label="Guests" value={String(eventData.guests)} />}
            {(eventData?.arrival_time || inputs.arrival_time) && (
              <Detail label="Arrival" value={eventData?.arrival_time ?? inputs.arrival_time ?? ''} />
            )}
            {inputs.start_time && <Detail label="Start time" value={inputs.start_time} />}
            {(eventData?.finish_time || inputs.finish_time) && (
              <Detail label="Finish time" value={eventData?.finish_time ?? inputs.finish_time ?? ''} />
            )}
            {(eventData?.load_out_time || inputs.load_out_time) && (
              <Detail label="Load out" value={eventData?.load_out_time ?? inputs.load_out_time ?? ''} />
            )}
            {inputs.set_configs?.length > 0 && (
              <Detail label="Set configs" value={inputs.set_configs.map(c => formatSetConfig(c)).join(', ')} />
            )}
            {(inputs.band_size_requested || rd?.band_size_requested) && (
              <Detail label="Band size" value={inputs.band_size_requested ?? rd?.band_size_requested ?? ''} />
            )}
            {(inputs.sets_requested || rd?.sets_requested) && (
              <Detail label="Sets" value={inputs.sets_requested ?? rd?.sets_requested ?? ''} />
            )}
          </div>
          {(rd?.sound_requirements || rd?.special_requirements || rd?.notes) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginTop: 8 }}>
              {rd?.sound_requirements && <Detail label="Sound" value={rd.sound_requirements} wide />}
              {rd?.special_requirements && <Detail label="Requirements" value={rd.special_requirements} wide />}
              {rd?.notes && <Detail label="Notes" value={rd.notes} wide />}
            </div>
          )}
        </Card>

        {inputs.is_multi_day && inputs.number_of_days > 1 && (
          <div style={{ marginBottom: '1rem', padding: '10px 14px', background: 'var(--bg-info)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-info)' }}>
            Multi-day booking: {inputs.number_of_days} performance days.
            {inputs.per_day_discount > 0 && ` Multi-day discount of ${Math.round(inputs.per_day_discount * 100)}% applied.`}
          </div>
        )}

        {options.length === 0 && (
          <Card label="Total fee">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{fmt(calculated.total_fee)}</span>
            </div>
          </Card>
        )}

        {/* Per booking type sections */}
        {bookingTypes.map((bt, index) => {
          const btOptions = options.filter(o => (o.booking_type ?? 'background') === bt)
          const paEngineerRate = quote.settings_snapshot?.pa_sound_engineer_rate ?? 0
          const { inclusions, requirements } = getQuoteItems(inputs, bt, bookingTypes, btOptions, paEngineerRate)
          const showDual = !!inputs.give_custom_and_standard && btOptions.some(o => o.waiting_cost > 0)

          const renderItem = (item: QuoteItem) => (
            <>{item.text}{item.link && <a href={item.link.href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{item.link.text}</a>}{item.linkSuffix}</>
          )

          return (
            <div key={bt}>
              {hasMultipleTypes && bt !== 'background' && (
                <div style={{
                  fontSize: 22, fontWeight: 600, color: 'var(--text)',
                  letterSpacing: '-0.02em',
                  margin: `${index === 0 ? '1.5rem' : '3rem'} 0 1rem`,
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid var(--border)',
                }}>
                  {BOOKING_TYPE_LABELS[bt] ?? bt.replace(/_/g, ' ')}
                </div>
              )}

              {showDual ? (
                <>
                  {/* Custom timings table */}
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Based on your timings
                  </div>
                  <PriceSectionCards options={btOptions} fmt={fmt} />

                  {/* Standard packages table */}
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: '24px 0 8px' }}>
                    Standard packages
                  </div>
                  <PriceSectionCards options={btOptions} fmt={fmt} useStandard />
                </>
              ) : (
                <PriceSectionCards options={btOptions} fmt={fmt} />
              )}

              {/* What's included */}
              <Card label="What's included">
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {inclusions.filter(i => i.show).map((item, idx) => (
                    <li key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--text-info)', marginTop: 1, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{renderItem(item)}</span>
                    </li>
                  ))}
                  {(inputs.selected_add_ons ?? []).filter(a => a.inclusion_text).map(addon => (
                    <li key={addon.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--text-info)', marginTop: 1, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{addon.inclusion_text}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Requirements */}
              <Card label="Requirements">
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {requirements.filter(r => r.show).map((item, idx) => (
                    <li key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--text-secondary)', marginTop: 1, flexShrink: 0 }}>·</span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{renderItem(item)}</span>
                    </li>
                  ))}
                  {(inputs.selected_add_ons ?? []).filter(a => a.requirement_text).map(addon => (
                    <li key={addon.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--text-secondary)', marginTop: 1, flexShrink: 0 }}>·</span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{addon.requirement_text}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )
        })}

        <div style={{ marginTop: '2rem', padding: '16px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            If you need any changes or additional requests, just drop us an email so we can make arrangements to accommodate them. Any changes made during checking-off or contracts need to be agreed by email first.
          </p>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text)', textAlign: 'center', marginTop: '1.5rem', lineHeight: 1.6 }}>
          If you&apos;d like to chat or have any questions please feel free to drop me a line, WhatsApp or text on 07734652303 or drop me an email.
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '0.75rem' }}>
          {quoteValidityText(inputs.event_date, isInternational)} Ward Smith Entertainment — wardsmithentertainment.com
        </p>
      </div>
    </div>
  )
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1rem',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

const headerBtnStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, padding: '6px 14px',
  background: 'var(--bg)', border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)', color: 'var(--text)',
  textDecoration: 'none', whiteSpace: 'nowrap', letterSpacing: '-0.01em',
}

const STANDARD_OVER_HOURS: Record<string, string> = {
  '2x45': 'up to 3 hours',
  '3x45': 'up to 4 hours',
  '4x45': 'up to 6 hours',
  '5x45': 'up to 8 hours',
}

function PriceSectionCards({ options, fmt, useStandard }: { options: PriceOption[]; fmt: (n: number) => string; useStandard?: boolean }) {
  if (!options || options.length === 0) return null
  const sizes = Array.from(new Set(options.map(o => o.band_size)))
  return (
    <>
      {sizes.map(size => {
        const sizeOptions = options.filter(o => o.band_size === size)
        const lineUp = sizeOptions[0]?.line_up ?? ''
        const hasPaEngineer = sizeOptions[0]?.has_extended_pa_engineer ?? false
        const lineUpSuffix = hasPaEngineer ? ' + Sound engineer' : ''
        return (
          <Card key={size} label={BAND_SIZE_LABELS[size]}>
            {lineUp && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: -6, marginBottom: 14 }}>
                ({lineUp}{lineUpSuffix})
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sizeOptions.map((opt, i) => {
                const price = useStandard ? opt.standard_total_price : opt.total_price
                const label = useStandard
                  ? `${formatSetConfig(opt.set_config)} over ${STANDARD_OVER_HOURS[opt.set_config] ?? ''}`
                  : formatSetConfig(opt.set_config)
                return (
                  <div key={opt.set_config} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: i < sizeOptions.length - 1 ? '0.5px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
                      {fmt(price)}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}
    </>
  )
}
