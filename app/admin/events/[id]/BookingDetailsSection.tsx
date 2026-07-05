'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updateBookingDetails } from '../actions'

const inputStyle: React.CSSProperties = {
  height: 30, padding: '0 8px', fontSize: 13,
  background: 'var(--bg)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none', width: '100%', boxSizing: 'border-box',
}

export default function BookingDetailsSection({
  eventId,
  initialBandSize,
  initialSets,
  initialFee,
}: {
  eventId: string
  initialBandSize: string | null
  initialSets: string | null
  initialFee: number | null
}) {
  const router = useRouter()
  const [bandSize, setBandSize] = useState(initialBandSize ?? '')
  const [sets, setSets] = useState(initialSets ?? '')
  const [fee, setFee] = useState(initialFee != null ? String(initialFee) : '')
  const [saving, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track the values already persisted, so blur only saves when something actually changed
  const lastSaved = useRef({ bandSize: bandSize, sets: sets, fee: fee })

  function handleBlur(next: { bandSize: string; sets: string; fee: string }) {
    if (
      next.bandSize === lastSaved.current.bandSize &&
      next.sets === lastSaved.current.sets &&
      next.fee === lastSaved.current.fee
    ) return

    lastSaved.current = next
    startTransition(async () => {
      await updateBookingDetails(eventId, {
        booked_band_size: next.bandSize.trim() || null,
        booked_sets: next.sets.trim() || null,
        booked_fee: next.fee ? parseFloat(next.fee) : null,
      })
      setSavedAt(Date.now())
      if (savedTimeout.current) clearTimeout(savedTimeout.current)
      savedTimeout.current = setTimeout(() => setSavedAt(null), 2000)
      router.refresh()
    })
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
    marginBottom: 4, display: 'block', letterSpacing: '0.02em',
  }

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
        <div>
          <label style={labelStyle}>Band size booked</label>
          <input
            style={inputStyle}
            placeholder="e.g. 5-piece"
            value={bandSize}
            onChange={e => setBandSize(e.target.value)}
            onBlur={() => handleBlur({ bandSize, sets, fee })}
          />
        </div>
        <div>
          <label style={labelStyle}>Sets</label>
          <input
            style={inputStyle}
            placeholder="e.g. 2 × 45 min"
            value={sets}
            onChange={e => setSets(e.target.value)}
            onBlur={() => handleBlur({ bandSize, sets, fee })}
          />
        </div>
        <div>
          <label style={labelStyle}>Total fee</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-secondary)', pointerEvents: 'none' }}>£</span>
            <input
              style={{ ...inputStyle, paddingLeft: 20 }}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={fee}
              onChange={e => setFee(e.target.value)}
              onBlur={() => handleBlur({ bandSize, sets, fee })}
            />
          </div>
        </div>
      </div>
      {(saving || savedAt) && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
          {saving ? 'Saving…' : 'Saved'}
        </div>
      )}
    </div>
  )
}
