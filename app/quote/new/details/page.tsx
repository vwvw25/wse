'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { QuoteInputs, BandSize, SetConfig, BookingType, TravelType } from '@/types/quote'

const BAND_SIZES: { value: BandSize; label: string }[] = [
  { value: 'duo', label: 'Duo' },
  { value: 'trio', label: 'Trio' },
  { value: 'quartet', label: 'Quartet' },
  { value: 'five_piece', label: 'Five piece' },
  { value: 'six_piece', label: 'Six piece' },
  { value: 'seven_piece', label: 'Seven piece' },
  { value: 'eight_piece', label: 'Eight piece' },
]

const SET_CONFIGS: { value: SetConfig; label: string }[] = [
  { value: '2x45', label: '2×45' },
  { value: '3x45', label: '3×45' },
  { value: '4x45', label: '4×45' },
  { value: '5x45', label: '5×45' },
]

const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  background: 'Background',
  dancing_under_40: 'Dancing <40',
  dancing_over_40: 'Dancing >40',
  wedding: 'Wedding',
}

function DetailsForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [submitting, setSubmitting] = useState(false)

  const bookingTypes = searchParams.getAll('bt') as BookingType[]
  const travelType = (searchParams.get('travel') ?? 'london') as TravelType
  const isMultiDay = searchParams.get('multiDay') === '1'

  const [form, setForm] = useState<Partial<QuoteInputs>>({
    booking_type: bookingTypes[0] ?? null,
    travel_type: travelType,
    is_multi_day: isMultiDay,
    number_of_days: isMultiDay ? 2 : 1,
    // Booleans default false
    is_boat: false, is_city_centre: false, is_stadium: false,
    is_private_house: false, has_secure_loading_bay: false,
    is_no_drive_zone: false, is_outdoor: false,
    client_provides_pa: false, is_powerless: false,
    has_limiter: false, is_acoustic: false, client_third_party_sound: false,
    mic_hire_required: false, buyout_required: false, is_roaming: false,
    is_move_between_sets: false, is_second_pa: false,
    is_costume_upgrade: false, is_charity_jukebox: false, is_prestige: false,
    // Numbers default 0
    pa_hours_before_midnight: 0, pa_hours_after_midnight: 0,
    singer_fee: 0, guitarist_fee: 0, drummer_fee: 0, bass_fee: 0,
    keys_fee: 0, sax_fee: 0, trombone_fee: 0, trumpet_fee: 0, singer_2_fee: 0,
    petrol_train_cost: 0, accommodation_cost: 0, accommodation_nights: 1,
    per_diem_rate: 0, performance_days: 1, travel_day_rate: 0, travel_days: 0,
    off_day_rate: 0, off_days: 0, flight_cost: 0, baggage_fee: 0,
    carry_on_items_required: 0, outgoing_uk_transfer_cost: 0,
    outgoing_dest_transfer_cost: 0, return_dest_transfer_cost: 0,
    return_uk_transfer_cost: 0, local_transport_cost: 0,
    visa_cost: 0, vaccinations_cost: 0, car_hire_cost: 0,
    instrument_carriage_cost: 0, costume_upgrade_fee: 0,
    charity_jukebox_fee: 0, move_between_sets_fee: 0, second_pa_fee: 0,
    per_day_discount: 0,
  })

  const set = useCallback((key: keyof QuoteInputs, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }))
  }, [])

  const toggleBool = useCallback((key: keyof QuoteInputs) => {
    setForm(f => ({ ...f, [key]: !f[key] }))
  }, [])

  const [venuePostcode, setVenuePostcode] = useState('')
  const [milesOutput, setMilesOutput] = useState('Enter postcode')
  const [activeBookingTypes, setActiveBookingTypes] = useState<Set<BookingType>>(new Set(bookingTypes))

  // Postcode distance calculation
  useEffect(() => {
    const pc = venuePostcode.trim().replace(/\s/g, '')
    if (pc.length < 5) { setMilesOutput('Enter postcode'); return }
    setMilesOutput('Calculating...')
    const timer = setTimeout(async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch('https://api.postcodes.io/postcodes/WC2N5DU').then(r => r.json()),
          fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`).then(r => r.json()),
        ])
        if (r1.status !== 200 || r2.status !== 200) { setMilesOutput('Postcode not found'); return }
        const { latitude: lat1, longitude: lon1 } = r1.result
        const { latitude: lat2, longitude: lon2 } = r2.result
        const R = 3958.8, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
        const miles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        setMilesOutput(`${Math.round(miles)} miles`)
      } catch { setMilesOutput('Could not calculate') }
    }, 600)
    return () => clearTimeout(timer)
  }, [venuePostcode])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const inputs: QuoteInputs = {
        ...(form as QuoteInputs),
        venue_postcode: venuePostcode || null,
        venue_name: form.venue_name ?? null,
        event_date: form.event_date ?? null,
        client_name: form.client_name ?? null,
        client_email: form.client_email ?? null,
      }
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs }),
      })
      if (!res.ok) throw new Error('Failed to generate quote')
      const { id } = await res.json()
      router.push(`/quote/${id}`)
    } catch (e) {
      console.error(e)
      alert('Something went wrong generating the quote.')
    } finally {
      setSubmitting(false)
    }
  }

  const isInternational = form.travel_type === 'international'
  const isDomesticOvernight = form.travel_type === 'domestic_overnight'
  const showTravel = isInternational || isDomesticOvernight

  return (
    <div style={{ padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em' }}>New quote</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Ward Smith Entertainment — Step 2 of 2</p>
        </div>

        {/* Event info */}
        <Card label="Event">
          <Grid cols={3}>
            <Field label="Client name">
              <Input value={form.client_name ?? ''} onChange={v => set('client_name', v || null)} placeholder="e.g. The Smith Family" />
            </Field>
            <Field label="Client email">
              <Input value={form.client_email ?? ''} onChange={v => set('client_email', v || null)} placeholder="client@example.com" />
            </Field>
            <Field label="Event date">
              <Input type="date" value={form.event_date ?? ''} onChange={v => set('event_date', v || null)} />
            </Field>
            <Field label="Venue name">
              <Input value={form.venue_name ?? ''} onChange={v => set('venue_name', v || null)} placeholder="e.g. The Savoy" />
            </Field>
          </Grid>
        </Card>

        {/* Booking type — pre-selected, can adjust */}
        <Card label="Booking type">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {(Object.keys(BOOKING_TYPE_LABELS) as BookingType[]).map(bt => (
              <div
                key={bt}
                onClick={() => {
                  const next = new Set(activeBookingTypes)
                  if (next.has(bt)) next.delete(bt)
                  else next.add(bt)
                  setActiveBookingTypes(next)
                  set('booking_type', [...next][0] ?? null)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px',
                  border: `0.5px solid ${activeBookingTypes.has(bt) ? 'var(--border-info)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: activeBookingTypes.has(bt) ? 'var(--bg-info)' : 'var(--bg)',
                  userSelect: 'none', transition: 'all 0.1s',
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  border: `1.5px solid ${activeBookingTypes.has(bt) ? 'var(--text-info)' : 'var(--border-hover)'}`,
                  background: activeBookingTypes.has(bt) ? 'var(--text-info)' : 'transparent',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{BOOKING_TYPE_LABELS[bt]}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Time */}
        <Card label="Time">
          <Grid cols={4}>
            <Field label="Start time" hint="Optional">
              <Input type="time" value={form.start_time ?? ''} onChange={v => set('start_time', v || null)} />
            </Field>
            <Field label="Finish time" hint="Assumes before 11pm if blank">
              <Input type="time" value={form.finish_time ?? ''} onChange={v => set('finish_time', v || null)} />
            </Field>
            <Field label="Load-in time" hint="Defaults to start −1hr (−1.5hrs if full PA)">
              <Input type="time" value={form.load_in_time ?? ''} onChange={v => set('load_in_time', v || null)} />
            </Field>
            <Field label="Load-out time" hint="Defaults to finish time">
              <Input type="time" value={form.load_out_time ?? ''} onChange={v => set('load_out_time', v || null)} />
            </Field>
          </Grid>
        </Card>

        {/* Band */}
        <Card label="Band">
          <Grid cols={2}>
            <Field label="Band size" hint="If set, quote returns options around selected size. If blank, full grid shown.">
              <Select
                value={form.band_size ?? ''}
                onChange={v => set('band_size', v || null)}
                options={[{ value: '', label: '— optional —' }, ...BAND_SIZES.map(b => ({ value: b.value, label: b.label }))]}
              />
            </Field>
            <Field label="Set configuration" hint="If set, quote returns options around selected config. If blank, all configs shown.">
              <Select
                value={form.set_config ?? ''}
                onChange={v => set('set_config', v || null)}
                options={[{ value: '', label: '— optional —' }, ...SET_CONFIGS.map(s => ({ value: s.value, label: s.label }))]}
              />
            </Field>
          </Grid>
        </Card>

        {/* Musician fees */}
        <Card label="Musician fees">
          <Grid cols={4}>
            {[
              ['singer_fee', 'Singer'], ['guitarist_fee', 'Guitarist'], ['drummer_fee', 'Drummer'],
              ['bass_fee', 'Bass'], ['keys_fee', 'Keys'], ['sax_fee', 'Sax'],
              ['trombone_fee', 'Trombone'], ['trumpet_fee', 'Trumpet'], ['singer_2_fee', 'Second singer'],
            ].map(([key, label]) => (
              <Field key={key} label={label as string}>
                <NumberInput
                  value={(form[key as keyof QuoteInputs] as number) ?? 0}
                  onChange={v => set(key as keyof QuoteInputs, v)}
                  prefix="£"
                />
              </Field>
            ))}
          </Grid>
        </Card>

        {/* Travel */}
        <Card label="Travel">
          <Grid cols={2} style={{ alignItems: 'start' }}>
            <Field label="Venue postcode" hint="Distance calculated from central London (WC2N 5DU)">
              <Input value={venuePostcode} onChange={setVenuePostcode} placeholder="e.g. SW1A 1AA" />
            </Field>
            <Field label="Approximate distance">
              <div style={{
                height: 36, display: 'flex', alignItems: 'center',
                padding: '0 10px', fontSize: 13, color: 'var(--text-secondary)',
                border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)',
              }}>
                {milesOutput}
              </div>
            </Field>
          </Grid>
        </Card>

        {/* Venue constraints */}
        <Card label="Venue constraints">
          <BoolGrid>
            {[
              ['is_boat', 'Boat'], ['is_city_centre', 'City / city centre'],
              ['is_stadium', 'Stadium / exhibition'], ['is_private_house', 'Private house'],
              ['has_secure_loading_bay', 'Secure loading bay'], ['is_no_drive_zone', 'No-drive zone'],
              ['is_outdoor', 'Outdoor'],
            ].map(([key, label]) => (
              <BoolTile key={key} label={label as string} active={!!form[key as keyof QuoteInputs]} onClick={() => toggleBool(key as keyof QuoteInputs)} />
            ))}
          </BoolGrid>
        </Card>

        {/* Sound */}
        <Card label="Sound">
          <BoolGrid>
            <BoolTile label="Client provides PA" active={!!form.client_provides_pa} onClick={() => toggleBool('client_provides_pa')} />
            <BoolTile label="Powerless PA" active={!!form.is_powerless} onClick={() => toggleBool('is_powerless')} />
            <BoolTile label="Venue limiter" active={!!form.has_limiter} onClick={() => toggleBool('has_limiter')} />
            <BoolTile label="Acoustic" active={!!form.is_acoustic} onClick={() => toggleBool('is_acoustic')} />
          </BoolGrid>
          {!form.client_provides_pa && (
            <div style={{ marginTop: 14 }}>
              <Grid cols={2}>
                <Field label="PA hire hours — before midnight">
                  <NumberInput value={form.pa_hours_before_midnight ?? 0} onChange={v => set('pa_hours_before_midnight', v)} step={0.5} />
                </Field>
                <Field label="PA hire hours — after midnight">
                  <NumberInput value={form.pa_hours_after_midnight ?? 0} onChange={v => set('pa_hours_after_midnight', v)} step={0.5} />
                </Field>
              </Grid>
            </div>
          )}
        </Card>

        {/* Add-ons */}
        <Card label="Add-ons">
          <BoolGrid>
            <BoolTile label="Mic hire" active={!!form.mic_hire_required} onClick={() => toggleBool('mic_hire_required')} />
            <BoolTile label="Buyout required" active={!!form.buyout_required} onClick={() => toggleBool('buyout_required')} />
            <BoolTile label="Roaming set" active={!!form.is_roaming} onClick={() => toggleBool('is_roaming')} />
            <BoolTile label="Move between sets" active={!!form.is_move_between_sets} onClick={() => toggleBool('is_move_between_sets')} />
            <BoolTile label="Second PA" active={!!form.is_second_pa} onClick={() => toggleBool('is_second_pa')} />
            <BoolTile label="Costume upgrade" active={!!form.is_costume_upgrade} onClick={() => toggleBool('is_costume_upgrade')} />
            <BoolTile label="Charity Jukebox" active={!!form.is_charity_jukebox} onClick={() => toggleBool('is_charity_jukebox')} />
            <BoolTile label="Prestige / Luxe" active={!!form.is_prestige} onClick={() => toggleBool('is_prestige')} />
          </BoolGrid>
          {form.is_move_between_sets && (
            <div style={{ marginTop: 12, maxWidth: 200 }}>
              <Field label="Move between sets fee (£)">
                <NumberInput value={form.move_between_sets_fee ?? 0} onChange={v => set('move_between_sets_fee', v)} prefix="£" />
              </Field>
            </div>
          )}
          {form.is_second_pa && (
            <div style={{ marginTop: 12, maxWidth: 200 }}>
              <Field label="Second PA fee (£)">
                <NumberInput value={form.second_pa_fee ?? 0} onChange={v => set('second_pa_fee', v)} prefix="£" />
              </Field>
            </div>
          )}
          {form.is_charity_jukebox && (
            <div style={{ marginTop: 12, maxWidth: 200 }}>
              <Field label="Charity Jukebox fee (£)">
                <NumberInput value={form.charity_jukebox_fee ?? 0} onChange={v => set('charity_jukebox_fee', v)} prefix="£" />
              </Field>
            </div>
          )}
          {form.is_costume_upgrade && (
            <div style={{ marginTop: 12, maxWidth: 200 }}>
              <Field label="Costume upgrade fee per musician (£)">
                <NumberInput value={form.costume_upgrade_fee ?? 0} onChange={v => set('costume_upgrade_fee', v)} prefix="£" />
              </Field>
            </div>
          )}
        </Card>

        {/* Multi-day */}
        {isMultiDay && (
          <Card label="Multi-day">
            <Grid cols={3}>
              <Field label="Number of days">
                <NumberInput value={form.number_of_days ?? 2} onChange={v => set('number_of_days', v)} min={2} />
              </Field>
              <Field label="Per-day discount" hint="e.g. 0.10 = 10%">
                <NumberInput value={form.per_day_discount ?? 0} onChange={v => set('per_day_discount', v)} step={0.01} max={1} />
              </Field>
            </Grid>
          </Card>
        )}

        {/* Travel costs — domestic overnight or international */}
        {showTravel && (
          <Card label="Travel costs">
            <Grid cols={3}>
              <Field label="Petrol / train (per person)">
                <NumberInput value={form.petrol_train_cost ?? 0} onChange={v => set('petrol_train_cost', v)} prefix="£" />
              </Field>
              <Field label="Accommodation (per person/night)">
                <NumberInput value={form.accommodation_cost ?? 0} onChange={v => set('accommodation_cost', v)} prefix="£" />
              </Field>
              <Field label="Accommodation nights">
                <NumberInput value={form.accommodation_nights ?? 1} onChange={v => set('accommodation_nights', v)} min={1} />
              </Field>
              <Field label="Per diem (per person/day)">
                <NumberInput value={form.per_diem_rate ?? 0} onChange={v => set('per_diem_rate', v)} prefix="£" />
              </Field>
              <Field label="Performance days">
                <NumberInput value={form.performance_days ?? 1} onChange={v => set('performance_days', v)} min={1} />
              </Field>
              <Field label="Travel day rate (per person)">
                <NumberInput value={form.travel_day_rate ?? 0} onChange={v => set('travel_day_rate', v)} prefix="£" />
              </Field>
              <Field label="Travel days">
                <NumberInput value={form.travel_days ?? 0} onChange={v => set('travel_days', v)} />
              </Field>
              <Field label="Off day rate (per person)">
                <NumberInput value={form.off_day_rate ?? 0} onChange={v => set('off_day_rate', v)} prefix="£" />
              </Field>
              <Field label="Off days">
                <NumberInput value={form.off_days ?? 0} onChange={v => set('off_days', v)} />
              </Field>
            </Grid>
          </Card>
        )}

        {/* International-only costs */}
        {isInternational && (
          <Card label="International travel">
            <Grid cols={3}>
              <Field label="Flight cost (per person/leg)">
                <NumberInput value={form.flight_cost ?? 0} onChange={v => set('flight_cost', v)} prefix="£" />
              </Field>
              <Field label="Baggage fee (per item)">
                <NumberInput value={form.baggage_fee ?? 0} onChange={v => set('baggage_fee', v)} prefix="£" />
              </Field>
              <Field label="Carry-on items required">
                <NumberInput value={form.carry_on_items_required ?? 0} onChange={v => set('carry_on_items_required', v)} />
              </Field>
              <Field label="Outgoing UK transfer (per person)">
                <NumberInput value={form.outgoing_uk_transfer_cost ?? 0} onChange={v => set('outgoing_uk_transfer_cost', v)} prefix="£" />
              </Field>
              <Field label="Outgoing dest. transfer (per person)">
                <NumberInput value={form.outgoing_dest_transfer_cost ?? 0} onChange={v => set('outgoing_dest_transfer_cost', v)} prefix="£" />
              </Field>
              <Field label="Return dest. transfer (per person)">
                <NumberInput value={form.return_dest_transfer_cost ?? 0} onChange={v => set('return_dest_transfer_cost', v)} prefix="£" />
              </Field>
              <Field label="Return UK transfer (per person)">
                <NumberInput value={form.return_uk_transfer_cost ?? 0} onChange={v => set('return_uk_transfer_cost', v)} prefix="£" />
              </Field>
              <Field label="Local transport (per person)">
                <NumberInput value={form.local_transport_cost ?? 0} onChange={v => set('local_transport_cost', v)} prefix="£" />
              </Field>
              <Field label="Visa (per person)">
                <NumberInput value={form.visa_cost ?? 0} onChange={v => set('visa_cost', v)} prefix="£" />
              </Field>
              <Field label="Vaccinations (per person)">
                <NumberInput value={form.vaccinations_cost ?? 0} onChange={v => set('vaccinations_cost', v)} prefix="£" />
              </Field>
              <Field label="Car hire (total)">
                <NumberInput value={form.car_hire_cost ?? 0} onChange={v => set('car_hire_cost', v)} prefix="£" />
              </Field>
              <Field label="Instrument carriage (total)">
                <NumberInput value={form.instrument_carriage_cost ?? 0} onChange={v => set('instrument_carriage_cost', v)} prefix="£" />
              </Field>
            </Grid>
          </Card>
        )}

        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          paddingTop: '1.25rem', marginTop: '1.5rem',
          borderTop: '0.5px solid var(--border)',
        }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: '8px 20px', fontSize: 13, fontFamily: 'var(--font)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              background: 'transparent', border: '0.5px solid var(--border-hover)',
              color: 'var(--text-secondary)', fontWeight: 500,
            }}
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '8px 20px', fontSize: 13, fontFamily: 'var(--font)',
              borderRadius: 'var(--radius-md)', cursor: submitting ? 'not-allowed' : 'pointer',
              background: 'var(--text)', border: 'none',
              color: 'var(--bg)', fontWeight: 500, opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Generating…' : 'Generate quote'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DetailsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading…</div>}>
      <DetailsForm />
    </Suspense>
  )
}

// --- UI components ---

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

function Grid({ cols, children, style }: { cols: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, ...style }}>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{hint}</span>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', height: 36, padding: '0 10px', fontSize: 13,
        color: 'var(--text)', background: 'var(--bg)',
        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
        outline: 'none', fontFamily: 'var(--font)',
      }}
    />
  )
}

function NumberInput({ value, onChange, prefix, step = 1, min = 0, max }: {
  value: number; onChange: (v: number) => void; prefix?: string; step?: number; min?: number; max?: number
}) {
  return (
    <div style={{ position: 'relative' }}>
      {prefix && (
        <span style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: 13, color: 'var(--text-secondary)', pointerEvents: 'none',
        }}>{prefix}</span>
      )}
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        style={{
          width: '100%', height: 36, padding: prefix ? '0 10px 0 22px' : '0 10px',
          fontSize: 13, color: 'var(--text)', background: 'var(--bg)',
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
          outline: 'none', fontFamily: 'var(--font)',
        }}
      />
    </div>
  )
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', height: 36, padding: '0 28px 0 10px', fontSize: 13,
        color: 'var(--text)', background: 'var(--bg)',
        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
        outline: 'none', fontFamily: 'var(--font)', appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b6b6b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function BoolGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
      {children}
    </div>
  )
}

function BoolTile({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px',
        border: `0.5px solid ${active ? 'var(--border-info)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)', cursor: 'pointer',
        background: active ? 'var(--bg-info)' : 'var(--bg)',
        userSelect: 'none', transition: 'background 0.1s',
      }}
    >
      <div style={{
        width: 14, height: 14, border: `1.5px solid ${active ? 'var(--text-info)' : 'var(--border-hover)'}`,
        borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'var(--text-info)' : 'transparent',
      }}>
        {active && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
    </div>
  )
}
