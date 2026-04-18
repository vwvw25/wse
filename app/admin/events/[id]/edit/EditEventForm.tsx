'use client'

import { useState, useTransition } from 'react'
import type { EventRecord } from '@/types/quote'
import { updateEvent, deleteEvent } from '../../actions'

const inputBase: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--bg)', color: 'var(--text)',
  fontFamily: 'var(--font)', boxSizing: 'border-box',
}

const textareaBase: React.CSSProperties = {
  ...inputBase,
  resize: 'vertical',
  minHeight: 72,
  lineHeight: 1.5,
}

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

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 20,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

export default function EditEventForm({ event }: { event: EventRecord }) {
  const [isPending, startTransition] = useTransition()
  const rd = event.request_details

  const [isAgency, setIsAgency] = useState(event.is_agency)
  const [agencyName, setAgencyName] = useState(event.agency_name ?? '')
  const [agentName, setAgentName] = useState(event.agent_name ?? '')
  const [clientEmail, setClientEmail] = useState(event.client_email ?? '')
  const [eventDate, setEventDate] = useState(event.event_date ?? '')
  const [venueName, setVenueName] = useState(event.venue_name ?? '')
  const [venuePostcode, setVenuePostcode] = useState(event.venue_postcode ?? '')
  const [venueAddress, setVenueAddress] = useState(event.venue_address ?? '')
  const [location, setLocation] = useState(event.location ?? '')
  const [guests, setGuests] = useState(event.guests != null ? String(event.guests) : '')
  const [arrivalTime, setArrivalTime] = useState(event.arrival_time ?? '')
  const [startTime, setStartTime] = useState(event.start_time ?? '')
  const [finishTime, setFinishTime] = useState(event.finish_time ?? '')
  const [loadOutTime, setLoadOutTime] = useState(event.load_out_time ?? '')

  const [bandSizeRequested, setBandSizeRequested] = useState(rd?.band_size_requested ?? '')
  const [setsRequested, setSetsRequested] = useState(rd?.sets_requested ?? '')
  const [specialRequirements, setSpecialRequirements] = useState(rd?.special_requirements ?? '')
  const [soundRequirements, setSoundRequirements] = useState(rd?.sound_requirements ?? '')
  const [notes, setNotes] = useState(rd?.notes ?? '')

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 500,
    border: `0.5px solid ${active ? 'var(--border-info)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    background: active ? 'var(--bg-info)' : 'var(--bg)',
    color: active ? 'var(--text-info)' : 'var(--text-secondary)',
    fontFamily: 'var(--font)', transition: 'all 0.1s',
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('is_agency', String(isAgency))
    startTransition(async () => {
      await updateEvent(event.id, fd)
    })
  }

  return (
    <form onSubmit={handleSubmit}>

      {/* Client type toggle */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Client type</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={toggleStyle(isAgency)} onClick={() => setIsAgency(true)}>Agency</button>
          <button type="button" style={toggleStyle(!isAgency)} onClick={() => setIsAgency(false)}>Direct</button>
        </div>
      </div>

      {/* Contact */}
      <SectionCard label="Contact">
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
      </SectionCard>

      {/* Event details */}
      <SectionCard label="Event">
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
          <Field label="Venue address" hint="optional">
            <input name="venue_address" type="text" value={venueAddress} onChange={e => setVenueAddress(e.target.value)}
              placeholder="e.g. 1 Strand, London" style={inputBase} />
          </Field>
        </div>
      </SectionCard>

      {/* Times */}
      <SectionCard label="Times">
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
      </SectionCard>

      {/* Request details */}
      <SectionCard label="Request details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Band size requested" hint="optional">
            <input name="band_size_requested" type="text" value={bandSizeRequested} onChange={e => setBandSizeRequested(e.target.value)}
              placeholder="e.g. Duo or Trio" style={inputBase} />
          </Field>
          <Field label="Sets requested" hint="optional">
            <input name="sets_requested" type="text" value={setsRequested} onChange={e => setSetsRequested(e.target.value)}
              placeholder="e.g. 2 × 45 min" style={inputBase} />
          </Field>
          <Field label="Special requirements" hint="optional">
            <textarea name="special_requirements" value={specialRequirements} onChange={e => setSpecialRequirements(e.target.value)}
              placeholder="Any special requirements…" style={textareaBase} />
          </Field>
          <Field label="Sound requirements" hint="optional">
            <textarea name="sound_requirements" value={soundRequirements} onChange={e => setSoundRequirements(e.target.value)}
              placeholder="Any sound requirements…" style={textareaBase} />
          </Field>
          <Field label="Notes" hint="optional" >
            <textarea name="notes" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes…" style={{ ...textareaBase, gridColumn: '1 / -1' }} />
          </Field>
        </div>
      </SectionCard>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href={`/admin/events/${event.id}`} style={{
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
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm('Delete this event? This cannot be undone.')) {
              startTransition(async () => { await deleteEvent(event.id) })
            }
          }}
          style={{
            padding: '8px 20px', fontSize: 13, fontWeight: 500,
            background: 'transparent', border: '0.5px solid var(--border)',
            color: 'var(--text-tertiary)', borderRadius: 'var(--radius-md)',
            cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font)',
          }}
        >
          Delete event
        </button>
      </div>
    </form>
  )
}
