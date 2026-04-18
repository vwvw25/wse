'use client'

import { useState, useTransition } from 'react'
import { createEvent } from '../actions'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 4 }}>({hint})</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ name, type = 'text', placeholder, value, onChange }: {
  name: string
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '8px 10px', fontSize: 13,
        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
        background: 'var(--bg)', color: 'var(--text)',
        fontFamily: 'var(--font)', boxSizing: 'border-box',
        outline: 'none',
      }}
    />
  )
}

export default function NewEventPage() {
  const [isPending, startTransition] = useTransition()
  const [isAgency, setIsAgency] = useState(true)

  const [agencyName, setAgencyName] = useState('')
  const [agentName, setAgentName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [venueName, setVenueName] = useState('')
  const [venuePostcode, setVenuePostcode] = useState('')
  const [location, setLocation] = useState('')
  const [startTime, setStartTime] = useState('')
  const [finishTime, setFinishTime] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [loadOutTime, setLoadOutTime] = useState('')
  const [guests, setGuests] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('is_agency', String(isAgency))
    startTransition(async () => {
      await createEvent(fd)
    })
  }

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '8px 10px', fontSize: 13,
    border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
    background: 'var(--bg)', color: 'var(--text)',
    fontFamily: 'var(--font)', boxSizing: 'border-box',
  }

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 500,
    border: `0.5px solid ${active ? 'var(--border-info)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    background: active ? 'var(--bg-info)' : 'var(--bg)',
    color: active ? 'var(--text-info)' : 'var(--text-secondary)',
    fontFamily: 'var(--font)', transition: 'all 0.1s',
  })

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)', maxWidth: 800 }}>
      <a href="/admin/events" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Events</a>

      <div style={{ margin: '16px 0 28px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>New event</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Create a new event manually</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Client type toggle */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Client type</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={toggleStyle(isAgency)} onClick={() => setIsAgency(true)}>Agency</button>
            <button type="button" style={toggleStyle(!isAgency)} onClick={() => setIsAgency(false)}>Direct</button>
          </div>
        </div>

        {/* Contact details */}
        <div style={{
          background: 'var(--bg)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Contact
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label={isAgency ? 'Agency name' : 'Client name'}>
              <input name="agency_name" type="text" value={agencyName} onChange={e => setAgencyName(e.target.value)}
                placeholder={isAgency ? 'e.g. Premier Talent' : 'e.g. Sarah Jones'}
                style={inputBase} />
            </Field>
            {isAgency && (
              <Field label="Agent name" hint="optional">
                <input name="agent_name" type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
                  placeholder="e.g. Jane Smith" style={inputBase} />
              </Field>
            )}
            <Field label="Client email" hint="optional">
              <input name="client_email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                placeholder="e.g. jane@agency.com" style={inputBase} />
            </Field>
          </div>
        </div>

        {/* Event details */}
        <div style={{
          background: 'var(--bg)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Event
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Event date">
              <input name="event_date" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} style={inputBase} />
            </Field>
            <Field label="Guests" hint="optional">
              <input name="guests" type="number" min={0} value={guests} onChange={e => setGuests(e.target.value)}
                placeholder="e.g. 120" style={inputBase} />
            </Field>
            <Field label="Venue name" hint="optional">
              <input name="venue_name" type="text" value={venueName} onChange={e => setVenueName(e.target.value)}
                placeholder="e.g. The Savoy" style={inputBase} />
            </Field>
            <Field label="Venue postcode" hint="optional">
              <input name="venue_postcode" type="text" value={venuePostcode} onChange={e => setVenuePostcode(e.target.value)}
                placeholder="e.g. SW1A 1AA" style={inputBase} />
            </Field>
            <Field label="Location" hint="optional">
              <input name="location" type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Central London" style={inputBase} />
            </Field>
          </div>
        </div>

        {/* Times */}
        <div style={{
          background: 'var(--bg)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 28,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Times
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Arrival time" hint="optional">
              <input name="arrival_time" type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} style={inputBase} />
            </Field>
            <Field label="Start time" hint="optional">
              <input name="start_time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputBase} />
            </Field>
            <Field label="Finish time" hint="optional">
              <input name="finish_time" type="time" value={finishTime} onChange={e => setFinishTime(e.target.value)} style={inputBase} />
            </Field>
            <Field label="Load out time" hint="optional">
              <input name="load_out_time" type="time" value={loadOutTime} onChange={e => setLoadOutTime(e.target.value)} style={inputBase} />
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/admin/events" style={{
            padding: '8px 20px', fontSize: 13, fontWeight: 500,
            background: 'transparent', border: '0.5px solid var(--border-hover)',
            color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)',
            textDecoration: 'none', display: 'inline-block',
          }}>
            Cancel
          </a>
          <button
            type="submit"
            disabled={isPending}
            style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 500,
              background: 'var(--text)', border: 'none',
              color: 'var(--bg)', borderRadius: 'var(--radius-md)',
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.6 : 1,
              fontFamily: 'var(--font)',
            }}
          >
            {isPending ? 'Creating…' : 'Create event'}
          </button>
        </div>
      </form>
    </div>
  )
}
