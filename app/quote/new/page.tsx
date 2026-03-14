'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BookingType, TravelType } from '@/types/quote'

export default function NewQuotePage() {
  const router = useRouter()
  const [bookingTypes, setBookingTypes] = useState<Set<BookingType>>(new Set())
  const [travel, setTravel] = useState<TravelType | null>(null)
  const [multiDay, setMultiDay] = useState<boolean | null>(null)

  function toggleBookingType(type: BookingType) {
    setBookingTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  function handleContinue() {
    const params = new URLSearchParams()
    bookingTypes.forEach(t => params.append('bt', t))
    if (travel) params.set('travel', travel)
    if (multiDay !== null) params.set('multiDay', multiDay ? '1' : '0')
    router.push(`/quote/new/details?${params.toString()}`)
  }

  const canContinue = bookingTypes.size > 0 && travel !== null && multiDay !== null

  return (
    <div style={{ padding: '2.5rem 1rem', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)' }}>New quote</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Ward Smith Entertainment</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, letterSpacing: '0.02em' }}>Step 1 of 2 — booking details</p>
        </div>

        {/* Booking type */}
        <Card label="Booking type">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <OptionTile
              label="Background"
              desc="No dance floor, ambient music, smaller PA setup"
              active={bookingTypes.has('background')}
              onClick={() => toggleBookingType('background')}
            />
            <OptionTile
              label="Dancing — under 40"
              desc="Smaller event, duo or trio appropriate"
              active={bookingTypes.has('dancing_under_40')}
              onClick={() => toggleBookingType('dancing_under_40')}
            />
            <OptionTile
              label="Dancing — over 40"
              desc="Larger event, quartet or bigger required"
              active={bookingTypes.has('dancing_over_40')}
              onClick={() => toggleBookingType('dancing_over_40')}
            />
            <OptionTile
              label="Wedding"
              desc="Ceremony, drinks reception and/or evening"
              active={bookingTypes.has('wedding')}
              onClick={() => toggleBookingType('wedding')}
            />
          </div>
        </Card>

        {/* Travel */}
        <Card label="Travel">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <OptionTile
              label="London / within 2 hours"
              desc="No overnight required"
              active={travel === 'london'}
              onClick={() => setTravel('london')}
            />
            <OptionTile
              label="UK over 2 hours"
              desc="No overnight required"
              active={travel === 'uk_over_2h'}
              onClick={() => setTravel('uk_over_2h')}
            />
            <OptionTile
              label="Domestic overnight"
              desc="UK stay required"
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

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.5rem',
      marginBottom: '1rem',
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
