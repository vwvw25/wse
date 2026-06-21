'use client'

import { useState, useTransition } from 'react'
import type { EventRecord } from '@/types/quote'
import type { BandTemplate, BandTemplateSlot } from '@/types/musicians'
import { updateEvent, deleteEvent } from '../../actions'

const SETS_OPTIONS = ['2 × 45 min', '2 × 60 min', '3 × 45 min', '4 × 45 min']

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

export default function EditEventForm({ event, templates, sources }: { event: EventRecord; templates: (BandTemplate & { slots: BandTemplateSlot[] })[]; sources: string[] }) {
  const [isPending, startTransition] = useTransition()
  const rd = event.request_details

  const [isAgency, setIsAgency] = useState(event.is_agency)
  const [agencyName, setAgencyName] = useState(event.agency_name ?? '')
  const [agentName, setAgentName] = useState(event.agent_name ?? '')
  const [agentFirstName, setAgentFirstName] = useState(event.agent_first_name ?? '')
  const [agentSurname, setAgentSurname] = useState(event.agent_surname ?? '')
  const [clientEmail, setClientEmail] = useState(event.client_email ?? '')
  const [clientPhone, setClientPhone] = useState((event as unknown as { client_phone?: string | null }).client_phone ?? '')
  const [source, setSource] = useState((event as unknown as { source?: string | null }).source ?? '')
  const [sourceJobUrl, setSourceJobUrl] = useState((event as unknown as { source_job_url?: string | null }).source_job_url ?? '')
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

  const [food, setFood] = useState<'yes' | 'no' | 'tbc' | null>(event.food ?? null)
  const [foodNotes, setFoodNotes] = useState(event.food_notes ?? '')
  const [dressCode, setDressCode] = useState((event as unknown as { dress_code?: string | null }).dress_code ?? '')

  const [bookedTemplateId, setBookedTemplateId] = useState(event.booked_band_template_id ?? '')
  const [bookedLineup, setBookedLineup] = useState(event.booked_lineup ?? '')
  const [bookedSets, setBookedSets] = useState(
    SETS_OPTIONS.includes(event.booked_sets ?? '') ? (event.booked_sets ?? '') : event.booked_sets ? 'custom' : ''
  )
  const [bookedSetsCustom, setBookedSetsCustom] = useState(
    event.booked_sets && !SETS_OPTIONS.includes(event.booked_sets) ? event.booked_sets : ''
  )

  function handleTemplateChange(templateId: string) {
    setBookedTemplateId(templateId)
    if (templateId) {
      const tpl = templates.find(t => t.id === templateId)
      if (tpl?.slots?.length) {
        setBookedLineup(tpl.slots.map(s => s.instrument).join(', '))
      }
    }
  }

  const [bandSizeRequested, setBandSizeRequested] = useState(rd?.band_size_requested ?? '')
  const [setsRequested, setSetsRequested] = useState(rd?.sets_requested ?? '')
  const [specialRequirements, setSpecialRequirements] = useState(rd?.special_requirements ?? '')
  const [soundRequirements, setSoundRequirements] = useState(rd?.sound_requirements ?? '')
  const [notes, setNotes] = useState(rd?.notes ?? '')
  const [roamingRequested, setRoamingRequested] = useState(rd?.roaming_requested ?? false)

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
    fd.set('food', food ?? '')
    fd.set('booked_band_template_id', bookedTemplateId)
    fd.set('booked_lineup', bookedLineup)
    fd.set('booked_sets', bookedSets === 'custom' ? bookedSetsCustom : bookedSets)
    fd.set('agent_first_name', agentFirstName)
    fd.set('agent_surname', agentSurname)
    fd.set('client_phone', clientPhone)
    fd.set('source', source)
    fd.set('source_job_url', sourceJobUrl)
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
          {isAgency ? (
            <>
              <Field label="Agency name">
                <input name="agency_name" type="text" value={agencyName} onChange={e => setAgencyName(e.target.value)}
                  placeholder="e.g. Premier Talent" style={inputBase} />
              </Field>
              <Field label="Agent name" hint="optional">
                <input name="agent_name" type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
                  placeholder="e.g. Jane Smith" style={inputBase} />
              </Field>
              <Field label="Agent email" hint="optional">
                <input name="client_email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                  placeholder="e.g. jane@agency.com" style={inputBase} />
              </Field>
            </>
          ) : (
            <>
              <Field label="First name" hint="optional">
                <input type="text" value={agentFirstName} onChange={e => setAgentFirstName(e.target.value)}
                  placeholder="e.g. Sarah" style={inputBase} />
              </Field>
              <Field label="Surname" hint="optional">
                <input type="text" value={agentSurname} onChange={e => setAgentSurname(e.target.value)}
                  placeholder="e.g. Jones" style={inputBase} />
              </Field>
              <Field label="Email" hint="optional">
                <input name="client_email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                  placeholder="e.g. sarah@example.com" style={inputBase} />
              </Field>
              <Field label="Telephone" hint="optional">
                <input type="text" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                  placeholder="e.g. 07700 900123" style={inputBase} />
              </Field>
            </>
          )}

          {/* Source — shown for all booking types */}
          <Field label="Source" hint="optional">
            <select
              value={source}
              onChange={e => {
                const v = e.target.value
                setSource(v)
                if (v !== 'Poptop' && v !== 'Encore') setSourceJobUrl('')
              }}
              style={{ ...inputBase, appearance: 'auto' as React.CSSProperties['appearance'] }}
            >
              <option value="">— Not set —</option>
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          {(source === 'Poptop' || source === 'Encore') && (
            <Field label="Job reference URL" hint="optional">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="url"
                  value={sourceJobUrl}
                  onChange={e => setSourceJobUrl(e.target.value)}
                  placeholder="https://…"
                  style={{ ...inputBase, flex: 1 }}
                />
                {sourceJobUrl && (
                  <a href={sourceJobUrl} target="_blank" rel="noreferrer"
                    style={{ flexShrink: 0, padding: '8px 12px', fontSize: 12, fontWeight: 500, color: 'var(--accent)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Open →
                  </a>
                )}
              </div>
            </Field>
          )}
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
          <Field label="Food provided">
            <select
              value={food ?? ''}
              onChange={e => {
                const v = e.target.value
                setFood(v === 'yes' || v === 'no' || v === 'tbc' ? v : null)
              }}
              style={{ ...inputBase, appearance: 'auto' }}
            >
              <option value="">—</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="tbc">TBC</option>
            </select>
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Food notes" hint="optional — internal only">
              <textarea name="food_notes" value={foodNotes} onChange={e => setFoodNotes(e.target.value)}
                placeholder="e.g. Crew meal at 17:00, dietary info to catering…" style={textareaBase} />
            </Field>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Dress code" hint="optional">
              <textarea name="dress_code" value={dressCode} onChange={e => setDressCode(e.target.value)}
                placeholder="e.g. Black tie, smart casual…" style={textareaBase} />
            </Field>
          </div>
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

      {/* Booking details */}
      <SectionCard label="Booking details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Band">
            <select
              value={bookedTemplateId}
              onChange={e => handleTemplateChange(e.target.value)}
              style={{ ...inputBase, appearance: 'auto' }}
            >
              <option value="">— Not set —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Sets">
            <select
              value={bookedSets}
              onChange={e => setBookedSets(e.target.value)}
              style={{ ...inputBase, appearance: 'auto' }}
            >
              <option value="">— Not set —</option>
              {SETS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              <option value="custom">Custom…</option>
            </select>
            {bookedSets === 'custom' && (
              <input
                type="text"
                value={bookedSetsCustom}
                onChange={e => setBookedSetsCustom(e.target.value)}
                placeholder="e.g. 1 × 90 min"
                style={{ ...inputBase, marginTop: 8 }}
              />
            )}
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Line-up" hint="auto-filled from band — editable">
              <input
                type="text"
                value={bookedLineup}
                onChange={e => setBookedLineup(e.target.value)}
                placeholder="e.g. Vocals, Guitar, Bass, Drums, Keys"
                style={inputBase}
              />
            </Field>
          </div>
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
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" name="roaming_requested" id="roaming_requested" checked={roamingRequested}
              onChange={e => setRoamingRequested(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <label htmlFor="roaming_requested" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>Roaming requested</label>
          </div>
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
