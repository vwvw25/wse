'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { BookingType, TravelType } from '@/types/quote'
import type { EventCardData } from './RequestDetailsCard'
import RequestDetailsCard from './RequestDetailsCard'

interface Props {
  eventId: string | null
  requestId: string | null
  prefill: {
    eventDate: string | null
    clientType: 'agency' | 'direct' | null
    eventCardData: EventCardData | null
  } | null
}

export default function NewQuoteForm({ eventId, requestId, prefill }: Props) {
  const router = useRouter()

  const [bookingType, setBookingType] = useState<'wedding' | 'other' | null>(null)
  const [travel, setTravel] = useState<TravelType | null>(null)
  const [multiDay, setMultiDay] = useState<boolean | null>(null)
  const [eventDate, setEventDate] = useState(prefill?.eventDate ?? '')
  const [clientType, setClientType] = useState<'direct' | 'agency' | null>(prefill?.clientType ?? null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const eventCardData = prefill?.eventCardData ?? null

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

        {eventCardData && <RequestDetailsCard data={eventCardData} />}

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
