'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updateTravelDetails } from './travel-actions'

const inputStyle: React.CSSProperties = {
  height: 30, padding: '0 8px', fontSize: 13,
  background: 'var(--bg)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none', width: '100%', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
  marginBottom: 4, display: 'block', letterSpacing: '0.02em',
}

type TravelMethod = '' | 'car' | 'train' | 'taxi'
type YesNo = '' | 'yes' | 'no'
type ParkingType = '' | 'free' | 'paid_reimbursable' | 'paid_not_reimbursable'

export default function TravelDetailsForm({
  eventId,
  initialTravelMethod,
  initialCongestionChargeRequired,
  initialParkingType,
}: {
  eventId: string
  initialTravelMethod: string | null
  initialCongestionChargeRequired: string | null
  initialParkingType: string | null
}) {
  const router = useRouter()
  const [method, setMethod] = useState<TravelMethod>((initialTravelMethod as TravelMethod) || '')
  const [congestion, setCongestion] = useState<YesNo>((initialCongestionChargeRequired as YesNo) || '')
  const [parking, setParking] = useState<ParkingType>((initialParkingType as ParkingType) || '')
  const [saving, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lastSaved = useRef({ method, congestion, parking })

  function save(next: { method: TravelMethod; congestion: YesNo; parking: ParkingType }) {
    if (
      next.method === lastSaved.current.method &&
      next.congestion === lastSaved.current.congestion &&
      next.parking === lastSaved.current.parking
    ) return

    lastSaved.current = next
    startTransition(async () => {
      await updateTravelDetails(eventId, {
        travel_method: next.method || null,
        congestion_charge_required: next.method === 'car' ? (next.congestion || null) : null,
        parking_type: next.method === 'car' ? (next.parking || null) : null,
      })
      setSavedAt(Date.now())
      if (savedTimeout.current) clearTimeout(savedTimeout.current)
      savedTimeout.current = setTimeout(() => setSavedAt(null), 2000)
      router.refresh()
    })
  }

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: method === 'car' ? '1fr 1fr 1fr' : '1fr', gap: '0 24px' }}>
        <div>
          <label style={labelStyle}>Method of travel</label>
          <select
            style={inputStyle}
            value={method}
            onChange={e => {
              const next = e.target.value as TravelMethod
              setMethod(next)
              save({ method: next, congestion, parking })
            }}
          >
            <option value="">—</option>
            <option value="car">Car</option>
            <option value="train">Train</option>
            <option value="taxi">Taxi</option>
          </select>
        </div>
        {method === 'car' && (
          <>
            <div>
              <label style={labelStyle}>Congestion charge required</label>
              <select
                style={inputStyle}
                value={congestion}
                onChange={e => {
                  const next = e.target.value as YesNo
                  setCongestion(next)
                  save({ method, congestion: next, parking })
                }}
              >
                <option value="">—</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Parking</label>
              <select
                style={inputStyle}
                value={parking}
                onChange={e => {
                  const next = e.target.value as ParkingType
                  setParking(next)
                  save({ method, congestion, parking: next })
                }}
              >
                <option value="">—</option>
                <option value="free">Free</option>
                <option value="paid_reimbursable">Paid – reimbursable by client</option>
                <option value="paid_not_reimbursable">Paid – not reimbursable by client</option>
              </select>
            </div>
          </>
        )}
      </div>
      {(saving || savedAt) && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
          {saving ? 'Saving…' : 'Saved'}
        </div>
      )}
    </div>
  )
}
