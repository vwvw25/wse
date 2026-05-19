'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { BookingType, TravelType } from '@/types/quote'
import { createBrowserClient } from '@/lib/supabase'
import RequestDetailsCard, { type EventCardData } from './RequestDetailsCard'

function NewQuoteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('event')
  const requestId = searchParams.get('request')

  const [bookingType, setBookingType] = useState<'wedding' | 'other' | null>(null)
  const [travel, setTravel] = useState<TravelType | null>(null)
  const [multiDay, setMultiDay] = useState<boolean | null>(null)
  const [eventDate, setEventDate] = useState('')
  const [clientType, setClientType] = useState<'direct' | 'agency' | null>(null)
  const [eventCardData, setEventCardData] = useState<EventCardData | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

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
        band_size_requested: rd?.band_size_requested as string | null ?? null,
        sets_requested: rd?.sets_requested as string | null ?? null,
        special_requirements: rd?.special_requirements as string | null ?? null,
        sound_requirements: rd?.sound_requirements as string | null ?? null,
        notes: rd?.notes as string | null ?? null,
      })
      if (af.event_date) setEventDate(af.event_date as string)
      setClientType(af.is_agency ? 'agency' : 'direct')
    }
    loadFromRequest()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  // Load event data as fallback (legacy direct event flow)
  useEffect(() => {
    if (!eventId || requestId) return
    async function loadEvent() {
      const { data } = await createBrowserClient()
        .from('events')
        .select('agency_name, agent_name, client_email, is_agency, event_date, venue_name, venue_postcode, venue_address, location, guests, arrival_time, start_time, finish_time, load_out_time, request_details')
        .eq('id', eventId)
        .single()
      if (!data) return
      const rd = data.request_details as { band_size_requested?: string | null; sets_requested?: string | null; special_requirements?: string | null; sound_requirements?: string | null; notes?: string | null } | null
      setEventCardData({
        agency_name: data.agency_name,
        agent_name: data.agent_name,
        client_email: data.client_email,
        event_date: data.event_date,
        venue_name: data.venue_name,
        venue_postcode: data.venue_postcode,
        venue_address: data.venue_address,
        location: data.location,
        guests: data.guests,
        arrival_time: data.arrival_time,
        start_time: data.start_time,
        finish_time: data.finish_time,
        load_out_time: data.load_out_time,
        band_size_requested: rd?.band_size_requested ?? null,
        sets_requested: rd?.sets_requested ?? null,
        special_requirements: rd?.special_requirements ?? null,
        sound_requirements: rd?.sound_requirements ?? null,
        notes: rd?.notes ?? null,
      })
      if (data.event_date) setEventDate(data.event_date)
      setClientType(data.is_agency ? 'agency' : 'direct')
    }
    loadEvent()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  function handleContinue() {
    const params = new URLSearchParams()
    const bt: BookingType = bookingType === 'wedding' ? 'wedding' : 'background'
    params.append('bt', bt)
    if (travel) params.set('travel', travel)
    if (multiDay !== null) params.set('multiDay', multiDay ? '1' : '0')
    if (eventDate) params.set('date', eventDate)
    if (clientType) params.set('clientType', clientType)
    if (eventId) params.set('event', eventId)
    if (requestId) params.set('request', requestId)
    router.push(`/quote/new/details?${params.toString()}`)
  }

  const canContinue = bookingType !== null && travel !== null && multiDay !== null && clientType !== null

  return (
    <div style={{ padding: '2.5rem 1rem', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)' }}>New quote</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Ward Smith Entertainment</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, letterSpacing: '0.02em' }}>Step 1 of 2 — booking details</p>
        </div>

        {/* Request details card — shown when coming from email */}
        {eventCardData && <RequestDetailsCard data={eventCardData} />}

        {/* Event date */}
        <Card label="Event date" onClick={() => dateInputRef.current?.showPicker()}>
          <input
            ref={dateInputRef}
            type="date"
            value={eventDate}
            onChange={e => setEventDate(e.target.value)}
            style={{
              width: '100%', height: 36, padding: '0 10px', fontSize: 13,
              color: 'var(--text)', background: 'var(--bg)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
              outline: 'none', fontFamily: 'var(--font)', cursor: 'pointer',
            }}
          />
        </Card>

        {/* Client type */}
        <Card label="Client">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <OptionTile
              label="Direct client"
              desc="Booking made directly with the client"
              active={clientType === 'direct'}
              onClick={() => setClientType('direct')}
            />
            <OptionTile
              label="Agency"
              desc="Booking made through an agency"
              active={clientType === 'agency'}
              onClick={() => setClientType('agency')}
            />
          </div>
        </Card>

        {/* Booking type */}
        <Card label="Booking type">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <OptionTile
              label="Other"
              desc="Corporate, private, background, dancing"
              active={bookingType === 'other'}
              onClick={() => setBookingType('other')}
            />
            <OptionTile
              label="Wedding"
              desc="Ceremony, drinks reception and/or evening"
              active={bookingType === 'wedding'}
              onClick={() => setBookingType('wedding')}
            />
          </div>
        </Card>

        {/* Travel */}
        <Card label="Travel">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <OptionTile
              label="London based"
              desc="Venue in or around London"
              active={travel === 'london_based'}
              onClick={() => setTravel('london_based')}
            />
            <OptionTile
              label="UK"
              desc="UK day trip, no overnight required"
              active={travel === 'uk'}
              onClick={() => setTravel('uk')}
            />
            <OptionTile
              label="UK overnight"
              desc="Hotel stay required"
              active={travel === 'domestic_overnight'}
              onClick={() => setTravel('domestic_overnight')}
            />
            <OptionTile
              label="International"
              desc="Travel outside UK"
              active={travel === 'international'}
              onClick={() => setTravel('international')}
            />
          </div>
        </Card>

        {/* Performance days */}
        <Card label="Performance days">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <OptionTile
              label="Single day"
              desc="One performance date"
              active={multiDay === false}
              onClick={() => setMultiDay(false)}
            />
            <OptionTile
              label="Multiple days"
              desc="Residency or multi-date engagement"
              active={multiDay === true}
              onClick={() => setMultiDay(true)}
            />
          </div>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            style={{
              padding: '10px 28px',
              fontSize: 14,
              fontWeight: 500,
              background: canContinue ? 'var(--text)' : 'var(--border)',
              color: canContinue ? 'var(--bg)' : 'var(--text-tertiary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: canContinue ? 'pointer' : 'not-allowed',
              letterSpacing: '-0.01em',
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NewQuotePage() {
  return (
    <Suspense>
      <NewQuoteForm />
    </Suspense>
  )
}

function Card({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--bg)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.5rem',
      marginBottom: '1rem',
      cursor: onClick ? 'pointer' : undefined,
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

function OptionTile({ label, desc, active, onClick }: {
  label: string; desc: string; active: boolean; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: 4,
        padding: 14,
        border: `0.5px solid ${active ? 'var(--border-info)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: active ? 'var(--bg-info)' : 'var(--bg)',
        userSelect: 'none',
        transition: 'all 0.1s',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
      <span style={{ fontSize: 12, color: active ? 'var(--text-info)' : 'var(--text-secondary)', lineHeight: 1.4, opacity: active ? 0.8 : 1 }}>
        {desc}
      </span>
    </div>
  )
}
