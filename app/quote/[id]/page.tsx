import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import type { QuoteRecord } from '@/types/quote'

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const quote = data as QuoteRecord
  const { inputs, calculated } = quote

  const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`
  const isInternational = inputs.travel_type === 'international'
  const isDomesticOvernight = inputs.travel_type === 'domestic_overnight' || isInternational

  // Line items — conditionally rendered
  const lineItems: { label: string; amount: number; show: boolean }[] = [
    { label: 'PA + sound engineer', amount: calculated.pa_hire_cost, show: calculated.pa_hire_cost > 0 },
    { label: 'No PA deduction', amount: calculated.pa_deduction, show: calculated.pa_deduction < 0 },
    { label: 'PA hire — before midnight', amount: calculated.pa_hire_before_midnight_cost, show: inputs.pa_hours_before_midnight > 0 },
    { label: 'PA hire — after midnight', amount: calculated.pa_hire_after_midnight_cost, show: inputs.pa_hours_after_midnight > 0 },
    { label: 'Waiting time', amount: calculated.waiting_time_cost, show: calculated.waiting_time_cost > 0 },
    { label: 'Band hours after midnight', amount: calculated.band_hours_after_midnight_cost, show: calculated.band_hours_after_midnight_cost > 0 },
    { label: 'Location surcharge', amount: calculated.location_surcharge, show: calculated.location_surcharge > 0 },
    { label: 'Petrol / train', amount: calculated.total_petrol_train_cost, show: isDomesticOvernight },
    { label: 'Accommodation', amount: calculated.total_accommodation_cost, show: isDomesticOvernight },
    { label: 'Per diem', amount: calculated.total_per_diem_cost, show: isDomesticOvernight },
    { label: 'Travel day rate', amount: calculated.total_travel_day_cost, show: (inputs.travel_days ?? 0) > 0 },
    { label: 'Off day rate', amount: calculated.total_off_day_cost, show: (inputs.off_days ?? 0) > 0 },
    { label: 'Flights', amount: calculated.total_flights_cost, show: isInternational },
    { label: 'Outgoing UK transfer', amount: calculated.total_outgoing_uk_transfer_cost, show: isInternational },
    { label: 'Outgoing destination transfer', amount: calculated.total_outgoing_dest_transfer_cost, show: isInternational },
    { label: 'Return destination transfer', amount: calculated.total_return_dest_transfer_cost, show: isInternational },
    { label: 'Return UK transfer', amount: calculated.total_return_uk_transfer_cost, show: isInternational },
    { label: 'Local transport', amount: calculated.total_local_transport_cost, show: isInternational },
    { label: 'Visa', amount: calculated.total_visa_cost, show: isInternational },
    { label: 'Shots / vaccinations', amount: calculated.total_vaccinations_cost, show: isInternational },
    { label: 'Car hire', amount: inputs.car_hire_cost ?? 0, show: isInternational },
    { label: 'Instrument carriage', amount: inputs.instrument_carriage_cost ?? 0, show: isInternational },
  ]

  const inclusions: { text: string; show: boolean }[] = [
    { text: 'All equipment for our use', show: true },
    { text: 'Based on a finish of 11pm or earlier', show: !inputs.finish_time || inputs.finish_time <= '23:00' },
    { text: 'Music via iPad/PA during intervals', show: !(inputs.selected_add_ons ?? []).some(a => a.name === 'Roaming set') },
    { text: 'Arrival one hour before performance start (1.5hrs if full PA)', show: true },
    { text: 'Quotes based on venue having parking', show: true },
    { text: 'Travel and expenses included', show: isDomesticOvernight },
    { text: 'If dancing and 40+ guests — book quartet or larger', show: inputs.booking_type === 'background' },
  ]

  const requirements: { text: string; show: boolean }[] = [
    { text: '2 × 13amp plug sockets', show: true },
    { text: 'Food clause — same menu choices as guests, or £20 per musician buyout', show: true },
    { text: 'Lockable indoor exclusive green room', show: true },
    { text: 'Soft drinks and mineral water', show: true },
    { text: 'Able to pack down at end of final set', show: true },
    { text: 'Full loading information required 2 weeks in advance', show: true },
    { text: 'Please advise of any accessibility considerations at the venue', show: true },
    { text: 'Client to hire drum kit locally', show: isInternational },
    { text: 'Client to provide keyboard or piano on-site', show: (inputs.keys_fee ?? 0) > 0 && isInternational },
    { text: 'Client to arrange transfers to/from performance location', show: isInternational && inputs.is_multi_day },
    { text: 'Accommodation to include breakfast and dinner', show: isDomesticOvernight },
  ]

  const eventDate = inputs.event_date
    ? new Date(inputs.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{ padding: '2.5rem 1rem', minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)' }}>
                {inputs.agency_name ? `Quote for ${inputs.agency_name}` : 'Quote'}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Ward Smith Entertainment</p>
              {inputs.agent_name && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Att: {inputs.agent_name}</p>}
              {eventDate && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{eventDate}</p>}
              {inputs.venue_name && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{inputs.venue_name}</p>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right' }}>
              <div>Ref: {id.slice(0, 8).toUpperCase()}</div>
              <div>{new Date(quote.created_at).toLocaleDateString('en-GB')}</div>
            </div>
          </div>
        </div>

        {/* Line items */}
        <Card label="Fee breakdown">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Base fee */}
            <LineItem label="Base performance fee" value={fmt(calculated.base_performance_fee)} />
            {lineItems.filter(i => i.show && i.amount !== 0).map(item => (
              <LineItem key={item.label} label={item.label} value={fmt(item.amount)} muted={item.amount < 0} />
            ))}
            {/* Dynamic add-ons */}
            {(inputs.selected_add_ons ?? []).map(addon => {
              const cost = addon.pricing_type === 'per_musician'
                ? addon.price * calculated.musician_count
                : addon.price
              return <LineItem key={addon.id} label={addon.line_item_label} value={fmt(cost)} />
            })}
          </div>
          <div style={{
            borderTop: '0.5px solid var(--border)', marginTop: 12, paddingTop: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {fmt(inputs.is_multi_day ? calculated.full_engagement_fee : calculated.total_fee)}
            </span>
          </div>
          {inputs.is_multi_day && inputs.number_of_days > 1 && (
            <div style={{
              marginTop: 8, padding: '8px 10px',
              background: 'var(--bg-info)', borderRadius: 'var(--radius-sm)',
              fontSize: 12, color: 'var(--text-info)',
            }}>
              Multi-day booking: {inputs.number_of_days} days at {fmt(calculated.single_day_fee)}/day.
              {calculated.per_day_saving > 0 && ` Saving ${fmt(calculated.per_day_saving)}/day with multi-day discount.`}
            </div>
          )}
        </Card>

        {/* Booking details summary */}
        <Card label="Booking details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            {inputs.agency_name && <Detail label="Agency" value={inputs.agency_name} />}
            {inputs.agent_name && <Detail label="Agent" value={inputs.agent_name} />}
            {inputs.booking_type && <Detail label="Booking type" value={inputs.booking_type.replace(/_/g, ' ')} />}
            {inputs.band_size && <Detail label="Band size" value={inputs.band_size.replace(/_/g, ' ')} />}
            {inputs.set_config && <Detail label="Set configuration" value={inputs.set_config} />}
            {inputs.start_time && <Detail label="Start time" value={inputs.start_time} />}
            {inputs.finish_time && <Detail label="Finish time" value={inputs.finish_time} />}
            {inputs.travel_type && <Detail label="Travel" value={inputs.travel_type.replace(/_/g, ' ')} />}
            {inputs.venue_postcode && <Detail label="Venue postcode" value={inputs.venue_postcode} />}
          </div>
        </Card>

        {/* What's included */}
        <Card label="What's included">
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inclusions.filter(i => i.show).map(item => (
              <li key={item.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-info)', marginTop: 1, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{item.text}</span>
              </li>
            ))}
            {/* Add-on inclusions */}
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

        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '1.5rem' }}>
          This quote is valid for 30 days. Ward Smith Entertainment — wardsmithentertainment.com
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

function LineItem({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', borderBottom: '0.5px solid var(--border)',
    }}>
      <span style={{ fontSize: 13, color: muted ? 'var(--text-secondary)' : 'var(--text)' }}>{label}</span>
      <span style={{ fontSize: 13, color: muted ? 'var(--text-secondary)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
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
