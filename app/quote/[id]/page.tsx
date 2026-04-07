import React from 'react'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { calculate, DEFAULT_SETTINGS, quoteValidityText } from '@/lib/calculations'
import type { QuoteRecord, PriceOption, BookingType, Settings } from '@/types/quote'
import AuditButton from './AuditButton'
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
    .select('*, event:events(location, request_details)')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const quote = data as QuoteRecord & { event?: { location?: string | null; request_details?: { band_size_requested?: string | null; sets_requested?: string | null } | null } | null }
  const eventData = quote.event
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
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right' }}>
                <div>Ref: {id.slice(0, 8).toUpperCase()}</div>
                <div>{new Date(quote.created_at).toLocaleDateString('en-GB')}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <a href={`/quote/builder?prefill=${id}`} style={headerBtnStyle}>Live builder →</a>
                <a href={`/quote/new/details?prefill=${id}`} style={headerBtnStyle}>Duplicate &amp; edit →</a>
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
            <Detail label="Location" value={inputs.location || eventData?.location || '—'} />
            {inputs.start_time && <Detail label="Start time" value={inputs.start_time} />}
            {inputs.finish_time && <Detail label="Finish time" value={inputs.finish_time} />}
            {inputs.set_configs?.length > 0 && <Detail label="Set configs" value={inputs.set_configs.map(c => formatSetConfig(c)).join(', ')} />}
            <Detail label="Band size requested" value={inputs.band_size_requested || eventData?.request_details?.band_size_requested || '—'} />
            <Detail label="Sets requested" value={inputs.sets_requested || eventData?.request_details?.sets_requested || '—'} />
          </div>
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
            { text: 'If dancing and 40+ guests — book quartet or larger', show: bt === 'dancing_over_40' || bt === 'wedding' },
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
            { text: 'If the venue isn\'t easily accessible by car then this may impact the quote and the equipment we\'re able to supply', show: true },
            { text: 'Client to hire drum kit locally if drummer is booked', show: isInternational && (inputs.drummer_fee ?? 0) > 0 },
            { text: 'Client to provide keyboard or piano on-site if pianist is booked', show: (inputs.keys_fee ?? 0) > 0 && isInternational },
            { text: 'Client to provide double bass on site if upright double bass is booked (alternatively bassist can bring electric bass)', show: isInternational && (inputs.bass_fee ?? 0) > 0 && ['roaming', 'jazz_keys', 'jazz_guitar'].includes(btBandType) },
          ]

          return (
            <div key={bt}>
              {hasMultipleTypes && (
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

              {/* Background suitability note */}
              {bt === 'background' && (
                <div style={{ marginBottom: '1rem', padding: '14px 16px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Suits the kind of events that:</p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {['are looking for background music', 'won\'t have a dance floor', 'the client doesn\'t see dancing as a big part of the event'].map(t => (
                      <li key={t} style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                        <span>–</span><span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quotes */}
              <PriceSectionCards options={btOptions} fmt={fmt} />

              {/* What's included */}
              <Card label="What's included">
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {inclusions.filter(i => i.show).map(item => (
                    <li key={item.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--text-info)', marginTop: 1, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{item.text}</span>
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
                  {(isInternational || inputs.client_provides_pa) && (
                    <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--text-secondary)', marginTop: 1, flexShrink: 0 }}>·</span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                        Client to provide full rider (for riders please see <a href="https://drive.google.com/drive/folders/1906sIEkcO5GTmLH395oRJuy6xtERE2QZ?usp=sharing" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>this folder</a>)
                      </span>
                    </li>
                  )}
                  {requirements.filter(r => r.show).map(item => (
                    <li key={item.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--text-secondary)', marginTop: 1, flexShrink: 0 }}>·</span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{item.text}</span>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2, textTransform: 'capitalize' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text)', textTransform: 'capitalize' }}>{value}</div>
    </div>
  )
}

const headerBtnStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, padding: '6px 14px',
  background: 'var(--bg)', border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)', color: 'var(--text)',
  textDecoration: 'none', whiteSpace: 'nowrap', letterSpacing: '-0.01em',
}

function PriceSectionCards({ options, fmt }: { options: PriceOption[]; fmt: (n: number) => string }) {
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
              {sizeOptions.map((opt, i) => (
                <div key={opt.set_config} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: i < sizeOptions.length - 1 ? '0.5px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>
                    {formatSetConfig(opt.set_config)}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
                    {fmt(opt.total_price)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )
      })}
    </>
  )
}
