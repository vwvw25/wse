'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import type { QuoteInputs, BandSize, SetConfig, BookingType, TravelType, AddOn, SelectedAddOn, RequestDetails } from '@/types/quote'
import RequestDetailsCard, { type EventCardData } from '../RequestDetailsCard'
import { BAND_TYPE_LABELS, BAND_SIZES_ORDERED, BAND_SIZE_LABELS, LINE_UP_LABELS } from '@/lib/lineups'
import type { BandType } from '@/lib/lineups'

const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  background: 'Background',
  dancing_under_40: 'Dancing <40',
  dancing_over_40: 'Dancing >40',
  wedding: 'Wedding',
}

interface Props {
  eventPrefill: {
    formFields: Partial<QuoteInputs>
    eventCardData: EventCardData
    roamingRequested?: boolean
  } | null
}

function DetailsFormInner({ eventPrefill }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [submitting, setSubmitting] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [addOns, setAddOns] = useState<AddOn[]>([])
  const [selectedAddOns, setSelectedAddOns] = useState<Map<string, SelectedAddOn>>(new Map())

  const bookingTypes = searchParams.getAll('bt') as BookingType[]
  const travelType = (searchParams.get('travel') ?? 'london_based') as TravelType
  const isMultiDay = searchParams.get('multiDay') === '1'
  const eventDateParam = searchParams.get('date') ?? ''
  const clientType = searchParams.get('clientType') as 'direct' | 'agency' | null
  const eventId = searchParams.get('event')
  const requestId = searchParams.get('request')
  const editId = searchParams.get('edit')

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
    is_prestige: false,
    venue_name_tbc: false,
    location: null, band_size_requested: null, sets_requested: null,
    is_custom_arrival_time: false, is_load_out_at_finish: true,
    // Event info
    agency_name: null, agent_name: null,
    event_date: eventDateParam || null,
    // Numbers default 0
    pa_hours_before_midnight: 0, pa_hours_after_midnight: 0,
    singer_fee: 400, guitarist_fee: 300, drummer_fee: 300, bass_fee: 300,
    keys_fee: 300, sax_fee: 300, trombone_fee: 300, trumpet_fee: 300, singer_2_fee: 300,
    travel_hours_from_london: 0,
    petrol_train_cost: 0, accommodation_cost: 0, accommodation_nights: 1,
    per_diem_rate: 0, performance_days: 1, travel_day_rate: 0, travel_days: 0,
    off_day_rate: 0, off_days: 0, flight_cost: 0, baggage_fee: 0,
    carry_on_items_required: 0, outgoing_uk_transfer_cost: 0,
    outgoing_dest_transfer_cost: 0, return_dest_transfer_cost: 0,
    return_uk_transfer_cost: 0, local_transport_cost: 0,
    visa_cost: 0, vaccinations_cost: 0, car_hire_cost: 0,
    instrument_carriage_cost: 0,
    per_day_discount: 0,
    // Apply server-fetched event prefill immediately
    ...eventPrefill?.formFields,
  })

  const set = useCallback((key: keyof QuoteInputs, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }))
  }, [])

  const toggleBool = useCallback((key: keyof QuoteInputs) => {
    setForm(f => ({ ...f, [key]: !f[key] }))
  }, [])

  const [bandSizesByType, setBandSizesByType] = useState<Partial<Record<BookingType, Set<BandSize>>>>({})
  const [setConfigsByType, setSetConfigsByType] = useState<Partial<Record<BookingType, Set<SetConfig>>>>({})
  const [bandTypeByType, setBandTypeByType] = useState<Partial<Record<BookingType, BandType>>>(() => {
    if (eventPrefill?.roamingRequested) {
      return Object.fromEntries(bookingTypes.map(bt => [bt, 'roaming' as BandType]))
    }
    return {}
  })

  function getBandType(bt: BookingType): BandType {
    return bandTypeByType[bt] ?? (bt === 'background' ? 'acoustic' : 'electric')
  }

  function toggleBandSize(bt: BookingType, size: BandSize) {
    setBandSizesByType(prev => {
      const next = { ...prev }
      const s = new Set(prev[bt] ?? [])
      if (s.has(size)) s.delete(size); else s.add(size)
      next[bt] = s
      return next
    })
  }

  function toggleSetConfig(bt: BookingType, cfg: SetConfig) {
    setSetConfigsByType(prev => {
      const next = { ...prev }
      const s = new Set(prev[bt] ?? [])
      if (s.has(cfg)) s.delete(cfg); else s.add(cfg)
      next[bt] = s
      return next
    })
  }

  const [customArrivalTime, setCustomArrivalTime] = useState(
    !!(eventPrefill?.formFields.arrival_time)
  )
  const [loadOutAtFinish, setLoadOutAtFinish] = useState(() => {
    const pf = eventPrefill?.formFields
    if (pf?.load_out_time && pf?.finish_time && pf.load_out_time !== pf.finish_time) return false
    return true
  })

  function computeAutoArrivalTime(startTime: string): string {
    const [h, m] = startTime.split(':').map(Number)
    const arrMins = h * 60 + m - 60
    const normalized = ((arrMins % 1440) + 1440) % 1440
    return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
  }

  const [venuePostcode, setVenuePostcode] = useState(eventPrefill?.formFields.venue_postcode ?? '')
  const [homePostcode, setHomePostcode] = useState<string | null>(null)
  const [milesOutput, setMilesOutput] = useState('Enter postcode')
  const [driveTime, setDriveTime] = useState<string | null>(null)
  const [activeBookingTypes, setActiveBookingTypes] = useState<Set<BookingType>>(new Set(bookingTypes))
  const [eventCardData, setEventCardData] = useState<EventCardData | null>(eventPrefill?.eventCardData ?? null)

  // Fetch add-ons from Supabase
  useEffect(() => {
    async function fetchAddOns() {
      const { data } = await createBrowserClient()
        .from('add_ons')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      setAddOns(data ?? [])
    }
    fetchAddOns()
  }, [])

  // Fetch home postcode from settings
  useEffect(() => {
    fetch('/api/admin/invoice-settings')
      .then(r => r.json())
      .then(data => { if (data?.home_postcode) setHomePostcode(data.home_postcode) })
      .catch(() => {})
  }, [])

  // Load from quote_request (email-to-quote flow via request param)
  useEffect(() => {
    if (!requestId) return
    async function loadFromRequest() {
      const { data } = await createBrowserClient()
        .from('quote_requests')
        .select('auto_fill, request_details')
        .eq('id', requestId)
        .single()
      if (!data) return
      const af = data.auto_fill as Record<string, unknown>
      const rd = data.request_details as Record<string, unknown> | null
      setEventCardData({
        agency_name: af.agency_name as string | null,
        agent_name: af.agent_name as string | null,
        client_email: af.client_email as string | null,
        event_date: af.event_date as string | null,
        venue_name: af.venue_name as string | null,
        venue_postcode: af.venue_postcode as string | null,
        venue_address: af.venue_address as string | null,
        location: af.location as string | null,
        guests: af.guests as number | null,
        arrival_time: af.arrival_time as string | null,
        start_time: af.start_time as string | null,
        finish_time: af.finish_time as string | null,
        load_out_time: af.load_out_time as string | null,
        band_size_requested: (rd?.band_size_requested as string | null) ?? null,
        sets_requested: (rd?.sets_requested as string | null) ?? null,
        special_requirements: (rd?.special_requirements as string | null) ?? null,
        sound_requirements: (rd?.sound_requirements as string | null) ?? null,
        notes: (rd?.notes as string | null) ?? null,
      })
      const autoArrival = (af.arrival_time as string | null)
        ?? (af.start_time ? computeAutoArrivalTime(af.start_time as string) : null)
      const autoLoadOut = (af.load_out_time as string | null) ?? (af.finish_time as string | null) ?? null
      setForm(f => ({
        ...f,
        agency_name: (af.agency_name as string | null) ?? f.agency_name,
        agent_name: (af.agent_name as string | null) ?? f.agent_name,
        client_email: (af.client_email as string | null) ?? f.client_email,
        event_date: (af.event_date as string | null) ?? f.event_date,
        venue_name: (af.venue_name as string | null) ?? f.venue_name,
        venue_postcode: (af.venue_postcode as string | null) ?? f.venue_postcode,
        location: (af.location as string | null) ?? f.location,
        band_size_requested: (rd?.band_size_requested as string | null) ?? f.band_size_requested,
        sets_requested: (rd?.sets_requested as string | null) ?? f.sets_requested,
        arrival_time: autoArrival,
        start_time: (af.start_time as string | null) ?? f.start_time,
        finish_time: (af.finish_time as string | null) ?? f.finish_time,
        load_out_time: autoLoadOut,
      }))
      if (af.arrival_time) setCustomArrivalTime(true)
      if (af.load_out_time && af.finish_time && af.load_out_time !== af.finish_time) {
        setLoadOutAtFinish(false)
      }
    }
    loadFromRequest()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  // Prefill from existing quote (duplicate flow or edit flow)
  const prefillId = searchParams.get('prefill')
  const loadId = editId ?? prefillId
  useEffect(() => {
    if (!loadId) return
    async function prefill() {
      const { data } = await createBrowserClient()
        .from('quotes')
        .select('inputs, request_details')
        .eq('id', loadId)
        .single()
      if (!data?.inputs) return
      if (data.request_details) {
        const rd = data.request_details as RequestDetails
        const inp2 = data.inputs as QuoteInputs
        setEventCardData({
          agency_name: inp2.agency_name,
          agent_name: inp2.agent_name,
          client_email: inp2.client_email,
          event_date: inp2.event_date,
          arrival_time: inp2.arrival_time,
          start_time: inp2.start_time,
          finish_time: inp2.finish_time,
          load_out_time: inp2.load_out_time,
          band_size_requested: rd.band_size_requested,
          sets_requested: rd.sets_requested,
          special_requirements: rd.special_requirements,
          sound_requirements: rd.sound_requirements,
          notes: rd.notes,
        })
      }
      const inp = data.inputs as QuoteInputs
      setForm(f => ({ ...f, ...inp }))
      const types = inp.booking_types?.length ? inp.booking_types : (inp.booking_type ? [inp.booking_type] : [])
      if (types.length) setActiveBookingTypes(new Set(types))
      if (inp.band_sizes_by_type && Object.keys(inp.band_sizes_by_type).length) {
        setBandSizesByType(Object.fromEntries(
          Object.entries(inp.band_sizes_by_type).map(([k, v]) => [k, new Set(v)])
        ))
      } else if (inp.band_sizes?.length && types[0]) {
        setBandSizesByType({ [types[0]]: new Set(inp.band_sizes) })
      }
      if (inp.set_configs_by_type && Object.keys(inp.set_configs_by_type).length) {
        setSetConfigsByType(Object.fromEntries(
          Object.entries(inp.set_configs_by_type).map(([k, v]) => [k, new Set(v)])
        ))
      } else if (inp.set_configs?.length && types[0]) {
        setSetConfigsByType({ [types[0]]: new Set(inp.set_configs) })
      }
      if (inp.band_types_by_type && Object.keys(inp.band_types_by_type).length) {
        setBandTypeByType(inp.band_types_by_type)
      } else if (inp.band_type && types[0]) {
        setBandTypeByType({ [types[0]]: inp.band_type })
      }
      if (inp.venue_postcode) setVenuePostcode(inp.venue_postcode)
      // Restore arrival / load-out checkbox state from saved inputs
      const legacyArrivalTime = (inp as unknown as Record<string, unknown>).load_in_time as string | null | undefined
      const hasCustomArrival = !!(inp.arrival_time ?? legacyArrivalTime)
      setCustomArrivalTime(hasCustomArrival)
      if (inp.load_out_time && inp.finish_time && inp.load_out_time !== inp.finish_time) {
        setLoadOutAtFinish(false)
      }
      if (inp.selected_add_ons?.length) {
        const map = new Map<string, SelectedAddOn>()
        inp.selected_add_ons.forEach(a => map.set(a.id, a))
        setSelectedAddOns(map)
      }
    }
    prefill()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId])

  // Driving distance + time via OSRM (free, no API key)
  useEffect(() => {
    const pc = venuePostcode.trim().toUpperCase().replace(/\s+/g, '')
    if (pc.length < 2) { setMilesOutput('Enter postcode'); setDriveTime(null); set('travel_hours_from_london', 0); return }
    setMilesOutput('Calculating…')
    setDriveTime(null)
    const timer = setTimeout(async () => {
      try {
        const origin = homePostcode?.trim().toUpperCase().replace(/\s+/g, '') || 'WC2N'
        const isFullPostcode = (p: string) => /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(p)
        const coordUrl = (p: string) => isFullPostcode(p)
          ? `https://api.postcodes.io/postcodes/${encodeURIComponent(p)}`
          : `https://api.postcodes.io/outcodes/${encodeURIComponent(p)}`

        const [r1, r2] = await Promise.all([
          fetch(coordUrl(origin)).then(r => r.json()),
          fetch(coordUrl(pc)).then(r => r.json()),
        ])
        if (r1.status !== 200 || r2.status !== 200) { setMilesOutput('Postcode not found'); setDriveTime(null); set('travel_hours_from_london', 0); return }
        const { latitude: lat1, longitude: lon1 } = r1.result
        const { latitude: lat2, longitude: lon2 } = r2.result

        // OSRM driving route
        const osrm = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`
        ).then(r => r.json())

        if (osrm.code !== 'Ok' || !osrm.routes?.[0]) {
          setMilesOutput('Route not found'); setDriveTime(null); set('travel_hours_from_london', 0); return
        }

        const metres = osrm.routes[0].distance
        const seconds = osrm.routes[0].duration
        const miles = metres / 1609.344
        const hours = seconds / 3600
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`

        setMilesOutput(`${Math.round(miles)} miles`)
        setDriveTime(timeStr)
        set('travel_hours_from_london', Math.round(hours * 10) / 10)
      } catch { setMilesOutput('Could not calculate'); setDriveTime(null) }
    }, 600)
    return () => clearTimeout(timer)
  }, [venuePostcode, homePostcode])

  function toggleAddOn(addon: AddOn) {
    setSelectedAddOns(prev => {
      const next = new Map(prev)
      if (next.has(addon.id)) {
        next.delete(addon.id)
      } else {
        next.set(addon.id, {
          id: addon.id,
          name: addon.name,
          pricing_type: addon.pricing_type,
          price: addon.default_price,
          line_item_label: addon.line_item_label,
          inclusion_text: addon.inclusion_text,
          requirement_text: addon.requirement_text,
        })
      }
      return next
    })
  }

  function updateAddOnPrice(id: string, price: number) {
    setSelectedAddOns(prev => {
      const next = new Map(prev)
      const existing = next.get(id)
      if (existing) next.set(id, { ...existing, price })
      return next
    })
  }

  const bookingTypesMissingSets = Array.from(activeBookingTypes).filter(
    bt => !(setConfigsByType[bt]?.size)
  )
  const canSubmit = activeBookingTypes.size > 0 && bookingTypesMissingSets.length === 0

  async function handleSubmit() {
    if (!canSubmit) {
      setShowValidation(true)
      return
    }
    setSubmitting(true)
    try {
      const primaryType = [...activeBookingTypes][0] as BookingType | undefined
      const inputs: QuoteInputs = {
        ...(form as QuoteInputs),
        selected_add_ons: Array.from(selectedAddOns.values()),
        venue_postcode: venuePostcode || null,
        venue_name: form.venue_name_tbc ? 'TBC' : form.venue_name ?? null,
        venue_name_tbc: form.venue_name_tbc ?? false,
        is_custom_arrival_time: customArrivalTime,
        is_load_out_at_finish: loadOutAtFinish,
        event_date: form.event_date ?? null,
        agency_name: form.agency_name ?? null,
        agent_name: form.agent_name ?? null,
        client_email: form.client_email ?? null,
        band_types_by_type: { ...bandTypeByType } as Partial<Record<BookingType, BandType>>,
        band_type: (primaryType ? bandTypeByType[primaryType] : null) ?? 'electric',
        booking_types: Array.from(activeBookingTypes),
        booking_type: primaryType ?? null,
        band_sizes_by_type: Object.fromEntries(
          Object.entries(bandSizesByType).map(([k, v]) => [k, Array.from(v ?? [])])
        ) as Partial<Record<BookingType, BandSize[]>>,
        set_configs_by_type: Object.fromEntries(
          Object.entries(setConfigsByType).map(([k, v]) => [k, Array.from(v ?? [])])
        ) as Partial<Record<BookingType, SetConfig[]>>,
        // Legacy fields — populated from primary type for backward compat
        band_sizes: Array.from(primaryType ? (bandSizesByType[primaryType] ?? []) : []),
        set_configs: Array.from(primaryType ? (setConfigsByType[primaryType] ?? []) : []),
      }
      const res = editId
        ? await fetch(`/api/quotes/${editId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs }),
          })
        : await fetch('/api/quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs, event_id: eventId ?? undefined, quote_request_id: requestId ?? undefined }),
          })
      if (!res.ok) throw new Error(editId ? 'Failed to update quote' : 'Failed to generate quote')
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
          <h1 style={{ fontSize: 22, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em' }}>{editId ? 'Edit quote' : 'New quote'}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Ward Smith Entertainment{editId ? '' : ' — Step 2 of 2'}</p>
        </div>

        {/* Request details card — shown when coming from event */}
        {eventCardData && <RequestDetailsCard data={eventCardData} />}

        {/* Event info */}
        <Card label="Event">
          <Grid cols={3}>
            {clientType === 'agency' ? (
              <>
                <Field label="Agency name">
                  <Input value={form.agency_name ?? ''} onChange={v => set('agency_name', v || null)} placeholder="e.g. Premier Talent" />
                </Field>
                <Field label="Agent name">
                  <Input value={form.agent_name ?? ''} onChange={v => set('agent_name', v || null)} placeholder="e.g. Jane Smith" />
                </Field>
              </>
            ) : (
              <Field label="Client name">
                <Input value={form.agency_name ?? ''} onChange={v => set('agency_name', v || null)} placeholder="e.g. Sarah Jones" />
              </Field>
            )}
            <Field label="Event date">
              <DateInput value={form.event_date ?? ''} onChange={v => set('event_date', v || null)} />
            </Field>
            <Field label="Location" hint="Optional">
              <Input value={form.location ?? ''} onChange={v => set('location', v || null)} placeholder="e.g. Central London, Manchester" />
            </Field>
            <Field label="Band size requested" hint="Optional">
              <Input value={form.band_size_requested ?? ''} onChange={v => set('band_size_requested', v || null)} placeholder="e.g. Duo or Trio" />
            </Field>
            <Field label="Sets requested" hint="Optional">
              <Input value={form.sets_requested ?? ''} onChange={v => set('sets_requested', v || null)} placeholder="e.g. 2 × 45 min" />
            </Field>
            <Field label="Venue name" hint="Optional" style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input
                  value={form.venue_name_tbc ? 'TBC' : (form.venue_name ?? '')}
                  onChange={v => set('venue_name', v || null)}
                  placeholder="e.g. The Savoy"
                  disabled={!!form.venue_name_tbc}
                />
                <div
                  onClick={() => toggleBool('venue_name_tbc')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '0 10px', height: 36, flexShrink: 0,
                    border: `0.5px solid ${form.venue_name_tbc ? 'var(--border-info)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    background: form.venue_name_tbc ? 'var(--bg-info)' : 'var(--bg)',
                    userSelect: 'none', transition: 'all 0.1s', whiteSpace: 'nowrap',
                  }}
                >
                  <div style={{
                    width: 14, height: 14,
                    border: `1.5px solid ${form.venue_name_tbc ? 'var(--text-info)' : 'var(--border-hover)'}`,
                    borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: form.venue_name_tbc ? 'var(--text-info)' : 'transparent',
                  }}>
                    {form.venue_name_tbc && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>TBC</span>
                </div>
              </div>
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
          <Grid cols={2}>
            <Field label="Start time">
              <Input type="time" value={form.start_time ?? ''} onChange={v => {
                set('start_time', v || null)
                if (!customArrivalTime) {
                  set('arrival_time', v ? computeAutoArrivalTime(v) : null)
                }
              }} />
            </Field>
            <Field label="Finish time">
              <Input type="time" value={form.finish_time ?? ''} onChange={v => {
                set('finish_time', v || null)
                if (loadOutAtFinish) set('load_out_time', v || null)
              }} />
            </Field>
          </Grid>
          <div style={{ marginTop: 12 }}>
          <BoolGrid>
            <BoolTile
              label="Custom arrival time"
              active={customArrivalTime}
              onClick={() => {
                const next = !customArrivalTime
                setCustomArrivalTime(next)
                if (!next && form.start_time) {
                  set('arrival_time', computeAutoArrivalTime(form.start_time))
                } else if (!next) {
                  set('arrival_time', null)
                }
              }}
            />
            <BoolTile
              label="Load out at finish"
              active={loadOutAtFinish}
              onClick={() => {
                const next = !loadOutAtFinish
                setLoadOutAtFinish(next)
                if (next) set('load_out_time', form.finish_time ?? null)
              }}
            />
            <BoolTile
              label="Custom + standard quotes"
              active={!!form.give_custom_and_standard}
              onClick={() => set('give_custom_and_standard', !form.give_custom_and_standard)}
            />
          </BoolGrid>
          </div>
          {customArrivalTime && (
            <Grid cols={2} style={{ marginTop: 12 }}>
              <Field label="Arrival time">
                <Input type="time" value={form.arrival_time ?? ''} onChange={v => set('arrival_time', v || null)} />
              </Field>
            </Grid>
          )}
          {!loadOutAtFinish && (
            <Grid cols={2} style={{ marginTop: 12 }}>
              <Field label="Load-out time">
                <Input type="time" value={form.load_out_time ?? ''} onChange={v => set('load_out_time', v || null)} />
              </Field>
            </Grid>
          )}
        </Card>

        {/* Per-booking-type: band type, line-up, set configs */}
        {Array.from(activeBookingTypes).map(bt => {
          const isDancingOver40 = bt === 'dancing_over_40'
          const currentBandType = getBandType(bt)
          const availableSizes = BAND_SIZES_ORDERED
            .filter(s => LINE_UP_LABELS[currentBandType]?.[s])
            .filter(s => isDancingOver40 ? !['duo', 'trio'].includes(s) : true)
          return (
            <Card key={bt} label={BOOKING_TYPE_LABELS[bt]}>
              {isDancingOver40 && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: -6, marginBottom: 14 }}>
                  {form.client_provides_pa
                    ? 'Duo and trio excluded.'
                    : 'PA + sound engineer automatically included. Duo and trio excluded.'}
                </p>
              )}
              <Grid cols={1}>
                <Field label="Band type">
                  <Select
                    value={currentBandType}
                    onChange={v => setBandTypeByType(prev => ({ ...prev, [bt]: v as BandType }))}
                    options={Object.entries(BAND_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                  />
                </Field>
              </Grid>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Line-up</div>
                <BoolGrid>
                  {availableSizes.map(size => (
                    <BoolTile
                      key={size}
                      label={BAND_SIZE_LABELS[size]}
                      active={bandSizesByType[bt]?.has(size) ?? false}
                      onClick={() => toggleBandSize(bt, size)}
                    />
                  ))}
                </BoolGrid>
              </div>
              <div style={{ marginTop: 14 }}>
                {(() => {
                  const setsMissing = showValidation && !(setConfigsByType[bt]?.size)
                  return (
                    <>
                      <div style={{
                        fontSize: 11, fontWeight: 500,
                        color: setsMissing ? 'var(--text-error, #c0392b)' : 'var(--text-secondary)',
                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
                      }}>
                        Number of sets{setsMissing ? ' — required' : ''}
                      </div>
                      <BoolGrid>
                        {(['1x60', '2x45', '3x45', '4x45', '5x45'] as SetConfig[]).map(cfg => (
                          <BoolTile
                            key={cfg}
                            label={cfg === '3x45' ? '3×45 or 2×60' : cfg.replace('x', '×')}
                            active={setConfigsByType[bt]?.has(cfg) ?? false}
                            onClick={() => toggleSetConfig(bt, cfg)}
                          />
                        ))}
                      </BoolGrid>
                      {setsMissing && (
                        <p style={{ fontSize: 12, color: 'var(--text-error, #c0392b)', marginTop: 8 }}>
                          Select at least one set option for {BOOKING_TYPE_LABELS[bt]}.
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>
            </Card>
          )
        })}

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
            <Field label="Venue postcode" hint={`Full or partial (e.g. N3, WC1)${homePostcode ? ` — from ${homePostcode}` : ''}`}>
              <Input value={venuePostcode} onChange={setVenuePostcode} placeholder="e.g. SW1A 1AA" />
            </Field>
            <Field label="Driving distance">
              <div style={{
                height: 36, display: 'flex', alignItems: 'center', gap: 10,
                padding: '0 10px', fontSize: 13, color: 'var(--text-secondary)',
                border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)',
              }}>
                <span>{milesOutput}</span>
                {driveTime && <span style={{ color: 'var(--text-tertiary)' }}>· {driveTime}</span>}
              </div>
            </Field>
          </Grid>
          {venuePostcode.trim().length >= 2 && milesOutput !== 'Calculating…' && milesOutput !== 'Enter postcode' && milesOutput !== 'Postcode not found' && milesOutput !== 'Could not calculate' && milesOutput !== 'Route not found' && (
            <div style={{ marginTop: 10 }}>
              <a
                href={`https://www.google.com/maps/dir/${encodeURIComponent(homePostcode ?? 'WC2N 5DU')}/${encodeURIComponent(venuePostcode.trim())}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
                  padding: '5px 10px', border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', background: 'var(--bg)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1C4.07 1 2.5 2.57 2.5 4.5c0 2.75 3.5 6.5 3.5 6.5s3.5-3.75 3.5-6.5C9.5 2.57 7.93 1 6 1zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" fill="currentColor"/></svg>
                Open in Google Maps
              </a>
            </div>
          )}
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
            <BoolTile label="Completely acoustic without amplification" active={!!form.is_acoustic} onClick={() => toggleBool('is_acoustic')} />
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
            {addOns.filter(a => a.name !== 'Prestige / Luxe').map(addon => (
              <BoolTile
                key={addon.id}
                label={addon.name}
                active={selectedAddOns.has(addon.id)}
                onClick={() => toggleAddOn(addon)}
              />
            ))}
            <BoolTile label="Prestige / Luxe" active={!!form.is_prestige} onClick={() => toggleBool('is_prestige')} />
          </BoolGrid>
          {/* Price inputs for editable selected add-ons */}
          {addOns.filter(a => a.price_editable && selectedAddOns.has(a.id)).map(addon => (
            <div key={addon.id} style={{ marginTop: 12, maxWidth: 220 }}>
              <Field label={`${addon.name} — ${addon.pricing_type === 'per_musician' ? 'fee per musician' : 'fee'} (£)`}>
                <NumberInput
                  value={selectedAddOns.get(addon.id)?.price ?? 0}
                  onChange={v => updateAddOnPrice(addon.id, v)}
                  prefix="£"
                />
              </Field>
            </div>
          ))}
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
            disabled={submitting || (showValidation && !canSubmit)}
            style={{
              padding: '8px 20px', fontSize: 13, fontFamily: 'var(--font)',
              borderRadius: 'var(--radius-md)', cursor: (submitting || (showValidation && !canSubmit)) ? 'not-allowed' : 'pointer',
              background: 'var(--text)', border: 'none',
              color: 'var(--bg)', fontWeight: 500, opacity: (submitting || (showValidation && !canSubmit)) ? 0.6 : 1,
            }}
          >
            {submitting ? (editId ? 'Saving…' : 'Generating…') : (editId ? 'Save changes' : 'Generate quote')}
          </button>
        </div>
        {showValidation && !canSubmit && (
          <p style={{ fontSize: 12, color: 'var(--text-error, #c0392b)', textAlign: 'right', marginTop: 8 }}>
            {activeBookingTypes.size === 0
              ? 'Select at least one booking type.'
              : 'Select at least one "Number of sets" option above for each booking type.'}
          </p>
        )}
      </div>
    </div>
  )
}

export default function DetailsForm({ eventPrefill }: Props) {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading…</div>}>
      <DetailsFormInner eventPrefill={eventPrefill} />
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

function Field({ label, hint, children, style }: { label: string; hint?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{hint}</span>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', height: 36, padding: '0 10px', fontSize: 13,
        color: 'var(--text)', background: disabled ? 'var(--bg-secondary)' : 'var(--bg)',
        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
        outline: 'none', fontFamily: 'var(--font)',
        opacity: disabled ? 0.6 : 1,
      }}
    />
  )
}

// Accepts/displays DD/MM/YYYY, stores YYYY-MM-DD internally
function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Convert YYYY-MM-DD → DD/MM/YYYY for display
  function toDisplay(iso: string) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }
  const [display, setDisplay] = React.useState(() => toDisplay(value))

  // Sync display if value changes externally (e.g. prefill)
  React.useEffect(() => { setDisplay(toDisplay(value)) }, [value])

  function handleChange(raw: string) {
    // Auto-insert slashes as user types
    let v = raw.replace(/[^\d]/g, '')
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2)
    if (v.length > 5) v = v.slice(0, 5) + '/' + v.slice(5)
    if (v.length > 10) v = v.slice(0, 10)
    setDisplay(v)

    // Convert to ISO when complete
    const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (match) {
      const [, d, m, y] = match
      onChange(`${y}-${m}-${d}`)
    } else if (!v) {
      onChange('')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Allow backspace to work naturally on the formatted string
    if (e.key === 'Backspace') {
      const cur = display
      // If cursor is right after a slash, skip the slash too
      const el = e.currentTarget
      const pos = el.selectionStart ?? cur.length
      if (pos > 0 && cur[pos - 1] === '/') {
        e.preventDefault()
        const next = cur.slice(0, pos - 2) + cur.slice(pos)
        setDisplay(next)
        setTimeout(() => el.setSelectionRange(pos - 2, pos - 2), 0)
      }
    }
  }

  return (
    <input
      type="text"
      value={display}
      onChange={e => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="DD/MM/YYYY"
      maxLength={10}
      inputMode="numeric"
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
