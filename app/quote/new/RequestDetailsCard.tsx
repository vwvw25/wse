import React from 'react'

export interface EventCardData {
  agency_name?: string | null
  agent_name?: string | null
  client_email?: string | null
  event_date?: string | null
  venue_name?: string | null
  venue_postcode?: string | null
  venue_address?: string | null
  location?: string | null
  guests?: number | null
  arrival_time?: string | null
  start_time?: string | null
  finish_time?: string | null
  load_out_time?: string | null
  band_size_requested?: string | null
  sets_requested?: string | null
  special_requirements?: string | null
  sound_requirements?: string | null
  notes?: string | null
}

function formatDate(d: string | null | undefined) {
  if (!d) return null
  const dt = new Date(d + 'T12:00:00')
  if (isNaN(dt.getTime())) return d
  const day = dt.toLocaleDateString('en-GB', { weekday: 'long' })
  const date = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${day}, ${date}`
}

function Cell({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2, letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? 'var(--text)' : 'var(--text-tertiary)' }}>{value || '—'}</div>
    </div>
  )
}

function FullRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ padding: '8px 0', borderTop: '0.5px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2, letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

export default function RequestDetailsCard({ data }: { data: EventCardData }) {
  const hasClientInfo = data.agency_name || data.agent_name || data.client_email || data.event_date
  const hasTimeInfo = data.arrival_time || data.start_time || data.finish_time || data.load_out_time
  const hasVenueInfo = data.venue_name || data.venue_postcode || data.location || data.venue_address || data.guests != null
  const hasRequestInfo = data.band_size_requested || data.sets_requested ||
    data.special_requirements || data.sound_requirements || data.notes

  if (!hasClientInfo && !hasTimeInfo && !hasVenueInfo && !hasRequestInfo) return null

  const times = [
    data.arrival_time && `Arrival ${data.arrival_time}`,
    data.start_time && `Start ${data.start_time}`,
    data.finish_time && `Finish ${data.finish_time}`,
    data.load_out_time && `Load out ${data.load_out_time}`,
  ].filter(Boolean).join(' · ')

  const hasLongFields = data.venue_address || data.special_requirements || data.sound_requirements || data.notes

  return (
    <div style={{
      background: 'var(--bg)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem 1.5rem',
      marginBottom: '1.25rem',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
      }}>
        Request details
      </div>

      {/* Client + date */}
      {hasClientInfo && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', borderBottom: (hasTimeInfo || hasVenueInfo || hasRequestInfo) ? '0.5px solid var(--border)' : undefined }}>
          <Cell label="Agency" value={data.agency_name} />
          <Cell label="Agent" value={data.agent_name} />
          <Cell label="Date" value={formatDate(data.event_date)} />
          <Cell label="Email" value={data.client_email} />
        </div>
      )}

      {/* Times */}
      {hasTimeInfo && (
        <div style={{ borderBottom: (hasVenueInfo || hasRequestInfo) ? '0.5px solid var(--border)' : undefined, padding: '8px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2, letterSpacing: '0.02em' }}>Times</div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>{times}</div>
        </div>
      )}

      {/* Venue */}
      {hasVenueInfo && (
        <div style={{ borderBottom: hasRequestInfo ? '0.5px solid var(--border)' : undefined }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
            <Cell label="Venue" value={data.venue_name} />
            <Cell label="Guests" value={data.guests != null ? String(data.guests) : null} />
            <Cell label="Postcode" value={data.venue_postcode} />
            <Cell label="Location" value={data.location} />
          </div>
          {data.venue_address && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2, letterSpacing: '0.02em' }}>Address</div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{data.venue_address}</div>
            </div>
          )}
        </div>
      )}

      {/* Request details */}
      {hasRequestInfo && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', borderBottom: (data.special_requirements || data.sound_requirements || data.notes) ? '0.5px solid var(--border)' : undefined }}>
            <Cell label="Band size requested" value={data.band_size_requested} />
            <Cell label="Sets requested" value={data.sets_requested} />
          </div>
          <FullRow label="Special requirements" value={data.special_requirements} />
          <FullRow label="Sound requirements" value={data.sound_requirements} />
          <FullRow label="Notes" value={data.notes} />
        </div>
      )}
    </div>
  )
}
