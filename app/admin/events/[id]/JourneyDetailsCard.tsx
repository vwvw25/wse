'use client'

import { useState, useEffect, useCallback } from 'react'
import { updateRoundTripMiles } from './travel-actions'

const isFullPostcode = (p: string) => /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(p)
const coordUrl = (p: string) => isFullPostcode(p)
  ? `https://api.postcodes.io/postcodes/${encodeURIComponent(p)}`
  : `https://api.postcodes.io/outcodes/${encodeURIComponent(p)}`

// Driving distance via postcodes.io + OSRM (free, no API key) — same approach as the quote builder
async function calculateMiles(homePostcode: string, venuePostcode: string): Promise<{ oneWay: number; roundTrip: number } | null> {
  const origin = homePostcode.trim().toUpperCase().replace(/\s+/g, '')
  const dest = venuePostcode.trim().toUpperCase().replace(/\s+/g, '')
  if (!origin || !dest) return null

  const [r1, r2] = await Promise.all([
    fetch(coordUrl(origin)).then(r => r.json()),
    fetch(coordUrl(dest)).then(r => r.json()),
  ])
  if (r1.status !== 200 || r2.status !== 200) return null
  const { latitude: lat1, longitude: lon1 } = r1.result
  const { latitude: lat2, longitude: lon2 } = r2.result

  const osrm = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`
  ).then(r => r.json())
  if (osrm.code !== 'Ok' || !osrm.routes?.[0]) return null

  const oneWay = osrm.routes[0].distance / 1609.344
  return { oneWay: Math.round(oneWay), roundTrip: Math.round(oneWay * 2) }
}

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '9px 0', borderBottom: '0.5px solid var(--border)',
}

const labelStyle: React.CSSProperties = { fontSize: 13, color: 'var(--text-secondary)' }
const valueStyle: React.CSSProperties = { fontSize: 13, color: 'var(--text)', fontWeight: 500 }

export default function JourneyDetailsCard({
  eventId,
  initialRoundTripMiles,
  homePostcode,
  venuePostcode,
}: {
  eventId: string
  initialRoundTripMiles: number | null
  homePostcode: string | null
  venuePostcode: string | null
}) {
  const [oneWayMiles, setOneWayMiles] = useState<number | null>(
    initialRoundTripMiles != null ? Math.round(initialRoundTripMiles / 2) : null
  )
  const [roundTripMiles, setRoundTripMiles] = useState<number | null>(initialRoundTripMiles)
  const [status, setStatus] = useState<'idle' | 'calculating' | 'error'>('idle')

  const recalculate = useCallback(() => {
    if (!homePostcode || !venuePostcode) return
    setStatus('calculating')
    calculateMiles(homePostcode, venuePostcode)
      .then(result => {
        if (!result) { setStatus('error'); return }
        setStatus('idle')
        setOneWayMiles(result.oneWay)
        setRoundTripMiles(result.roundTrip)
        updateRoundTripMiles(eventId, result.roundTrip)
      })
      .catch(() => setStatus('error'))
  }, [eventId, homePostcode, venuePostcode])

  // Auto-calculate on load if not already recorded
  useEffect(() => {
    if (initialRoundTripMiles == null && homePostcode && venuePostcode) {
      recalculate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: '4px 0 0' }}>
      <div style={rowStyle}>
        <span style={labelStyle}>Starting postcode</span>
        <span style={homePostcode ? valueStyle : { ...valueStyle, fontWeight: 400, color: 'var(--text-tertiary)' }}>
          {homePostcode ?? 'Not set'}
        </span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Venue postcode</span>
        <span style={venuePostcode ? valueStyle : { ...valueStyle, fontWeight: 400, color: 'var(--text-tertiary)' }}>
          {venuePostcode ?? 'Not set'}
        </span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>One way miles</span>
        <span style={valueStyle}>
          {status === 'calculating' ? 'Calculating…' : oneWayMiles != null ? `${oneWayMiles} miles` : '—'}
        </span>
      </div>
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <span style={labelStyle}>Round trip miles</span>
        <span style={valueStyle}>
          {status === 'calculating' ? 'Calculating…' : roundTripMiles != null ? `${roundTripMiles} miles` : '—'}
        </span>
      </div>

      {!homePostcode && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
          Set your postcode in Settings to calculate distance.
        </div>
      )}
      {homePostcode && !venuePostcode && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
          Add a venue postcode on this event to calculate distance.
        </div>
      )}
      {status === 'error' && (
        <div style={{ fontSize: 11, color: 'var(--text-danger)', marginTop: 8 }}>
          Couldn&rsquo;t calculate distance.
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        {homePostcode && venuePostcode && (
          <a
            href={`https://www.google.com/maps/dir/${encodeURIComponent(homePostcode)}/${encodeURIComponent(venuePostcode)}`}
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
            Open journey in Google Maps
          </a>
        )}
        {homePostcode && venuePostcode && (
          <button
            type="button"
            onClick={recalculate}
            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 }}
          >
            {status === 'calculating' ? 'Calculating…' : 'Recalculate'}
          </button>
        )}
      </div>
    </div>
  )
}
