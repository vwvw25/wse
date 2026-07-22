'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createEvent, checkPotentialDuplicateEvents } from '../actions'
import type { DuplicateEventMatch } from '@/lib/duplicate-events'
import type { DressCodeTemplate } from '../../dress-codes/actions'
import { EVENT_STATUSES } from '@/lib/event-statuses'
import type { EventStatus } from '@/lib/event-statuses'
import ContractStatusModal from '../ContractStatusModal'
import DuplicateWarningModal from '../DuplicateWarningModal'
import DateInput from '@/app/components/DateInput'

function Field({ label, hint, children, span2 }: { label: string; hint?: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div style={span2 ? { gridColumn: '1 / -1' } : undefined}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 4 }}>({hint})</span>}
      </label>
      {children}
    </div>
  )
}

const inputBase: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--bg)', color: 'var(--text)',
  fontFamily: 'var(--font)', boxSizing: 'border-box', outline: 'none',
}

function TextInput({ name, type = 'text', placeholder, value, onChange }: {
  name: string; type?: string; placeholder?: string; value: string; onChange: (v: string) => void
}) {
  return (
    <input name={name} type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)} style={inputBase} />
  )
}

function Select({ name, value, onChange, children }: {
  name: string; value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <select name={name} value={value} onChange={e => onChange(e.target.value)}
      style={{ ...inputBase, appearance: 'none' }}>
      {children}
    </select>
  )
}

export default function NewEventForm({ dressCodeTemplates }: { dressCodeTemplates: DressCodeTemplate[] }) {
  const [isPending, startTransition] = useTransition()
  const [isAgency, setIsAgency] = useState(true)

  // Contact
  const [agencyName, setAgencyName] = useState('')
  const [agentName, setAgentName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  // Event
  const [eventDate, setEventDate] = useState('')
  const [eventType, setEventType] = useState('')
  const [guests, setGuests] = useState('')

  // Venue
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [venuePostcode, setVenuePostcode] = useState('')
  const [location, setLocation] = useState('')

  // Times
  const [arrivalTime, setArrivalTime] = useState('')
  const [startTime, setStartTime] = useState('')
  const [finishTime, setFinishTime] = useState('')
  const [loadOutTime, setLoadOutTime] = useState('')

  // Booking details
  const [bandSizeRequested, setBandSizeRequested] = useState('')
  const [setsRequested, setSetsRequested] = useState('')
  const [bookedBandSize, setBookedBandSize] = useState('')
  const [bookedSets, setBookedSets] = useState('')
  const [bookedFee, setBookedFee] = useState('')
  const [dressCode, setDressCode] = useState('')
  const [dressCodeTemplateId, setDressCodeTemplateId] = useState('')
  const [idRequired, setIdRequired] = useState('')
  const [specialRequirements, setSpecialRequirements] = useState('')

  // Food
  const [food, setFood] = useState('')
  const [foodNotes, setFoodNotes] = useState('')

  // Source
  const [source, setSource] = useState('')
  const [sourceJobUrl, setSourceJobUrl] = useState('')

  // Contract upload
  const contractFileRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [status, setStatus] = useState<EventStatus>('enquiry')
  const [showStatusPrompt, setShowStatusPrompt] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateEventMatch[] | null>(null)
  const pendingFormDataRef = useRef<FormData | null>(null)

  async function handleContractUpload(file: File) {
    setParsing(true)
    setParseError(null)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      const res = await fetch('/api/admin/parse-contract', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Parse failed')
      const p = json.parsed
      if (p.agency_name) { setAgencyName(p.agency_name); setIsAgency(true) }
      if (p.agent_name) setAgentName(p.agent_name)
      if (p.client_email) setClientEmail(p.client_email)
      if (p.event_date) setEventDate(p.event_date)
      if (p.venue_name) setVenueName(p.venue_name)
      if (p.venue_address) setVenueAddress(p.venue_address)
      if (p.venue_postcode) setVenuePostcode(p.venue_postcode)
      if (p.location) setLocation(p.location)
      if (p.arrival_time) setArrivalTime(p.arrival_time)
      if (p.start_time) setStartTime(p.start_time)
      if (p.finish_time) setFinishTime(p.finish_time)
      if (p.load_out_time) setLoadOutTime(p.load_out_time)
      if (p.guests != null) setGuests(String(p.guests))
      if (p.band_size) setBookedBandSize(p.band_size)
      if (p.sets_requested) setBookedSets(p.sets_requested)
      if (p.fee != null) setBookedFee(String(p.fee))
      setShowStatusPrompt(true)
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Failed to parse contract')
    } finally {
      setParsing(false)
    }
  }

  function handleStatusSelect(next: 'contract_received' | 'contracted') {
    setStatus(next)
    setShowStatusPrompt(false)
  }

  // Warn before leaving with unsaved input — this form only creates the event
  // on submit, so there's nothing to autosave into until then.
  const isDirty = !!(
    agencyName || agentName || clientEmail || clientPhone ||
    eventDate || eventType || guests ||
    venueName || venueAddress || venuePostcode || location ||
    arrivalTime || startTime || finishTime || loadOutTime ||
    bandSizeRequested || setsRequested || bookedBandSize || bookedSets || bookedFee ||
    dressCode || dressCodeTemplateId || idRequired || specialRequirements ||
    food || foodNotes || source || sourceJobUrl
  )
  const submittedRef = useRef(false)

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty && !submittedRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('is_agency', String(isAgency))
    startTransition(async () => {
      const matches = await checkPotentialDuplicateEvents(fd)
      if (matches.length > 0) {
        pendingFormDataRef.current = fd
        setDuplicates(matches)
        return
      }
      submittedRef.current = true
      await createEvent(fd)
    })
  }

  function handleConfirmCreateAnyway() {
    const fd = pendingFormDataRef.current
    if (!fd) return
    setDuplicates(null)
    submittedRef.current = true
    startTransition(async () => {
      await createEvent(fd)
    })
  }

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 500,
    border: `0.5px solid ${active ? 'var(--border-info)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    background: active ? 'var(--bg-info)' : 'var(--bg)',
    color: active ? 'var(--text-info)' : 'var(--text-secondary)',
    fontFamily: 'var(--font)', transition: 'all 0.1s',
  })

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 20,
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16,
  }

  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)', maxWidth: 800 }}>
      <a href="/admin/events" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Events</a>

      <div style={{ margin: '16px 0 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>New event</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Create a new event manually</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <button
            type="button"
            onClick={() => contractFileRef.current?.click()}
            disabled={parsing}
            style={{
              padding: '8px 14px', fontSize: 13, fontWeight: 500,
              background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
              color: 'var(--text)', borderRadius: 'var(--radius-sm)',
              cursor: parsing ? 'wait' : 'pointer', fontFamily: 'var(--font)',
              whiteSpace: 'nowrap',
            }}
          >
            {parsing ? 'Parsing contract…' : 'Fill from contract'}
          </button>
          {parseError && <span style={{ fontSize: 12, color: '#b91c1c' }}>{parseError}</span>}
          {status !== 'enquiry' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 6,
                background: EVENT_STATUSES.find(s => s.value === status)?.bg,
                color: EVENT_STATUSES.find(s => s.value === status)?.color,
              }}>
                {EVENT_STATUSES.find(s => s.value === status)?.label}
              </span>
              <button
                type="button"
                onClick={() => setShowStatusPrompt(true)}
                style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'var(--font)' }}
              >
                change
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        ref={contractFileRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleContractUpload(f)
          e.target.value = ''
        }}
      />

      <form onSubmit={handleSubmit}>
        <input type="hidden" name="status" value={status} />
        {/* Client type toggle */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Client type</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={toggleStyle(isAgency)} onClick={() => setIsAgency(true)}>Agency</button>
            <button type="button" style={toggleStyle(!isAgency)} onClick={() => setIsAgency(false)}>Direct</button>
          </div>
        </div>

        {/* Contact */}
        <div style={sectionStyle}>
          <div style={sectionLabel}>Contact</div>
          <div style={grid}>
            <Field label={isAgency ? 'Agency name' : 'Client name'}>
              <TextInput name="agency_name" value={agencyName} onChange={setAgencyName}
                placeholder={isAgency ? 'e.g. Premier Talent' : 'e.g. Sarah Jones'} />
            </Field>
            {isAgency && (
              <Field label="Agent name" hint="optional">
                <TextInput name="agent_name" value={agentName} onChange={setAgentName} placeholder="e.g. Jane Smith" />
              </Field>
            )}
            <Field label="Client email" hint="optional">
              <TextInput name="client_email" type="email" value={clientEmail} onChange={setClientEmail} placeholder="e.g. jane@agency.com" />
            </Field>
            <Field label="Client phone" hint="optional">
              <TextInput name="client_phone" type="tel" value={clientPhone} onChange={setClientPhone} placeholder="e.g. 07700 900000" />
            </Field>
          </div>
        </div>

        {/* Event */}
        <div style={sectionStyle}>
          <div style={sectionLabel}>Event</div>
          <div style={grid}>
            <Field label="Event date">
              <DateInput name="event_date" value={eventDate} onChange={setEventDate} style={inputBase} />
            </Field>
            <Field label="Event type" hint="optional">
              <Select name="event_type" value={eventType} onChange={setEventType}>
                <option value="">Select…</option>
                <option value="wedding">Wedding</option>
                <option value="corporate">Corporate</option>
                <option value="private_party">Private party</option>
                <option value="birthday">Birthday</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Guests" hint="optional">
              <input name="guests" type="number" min={0} value={guests} onChange={e => setGuests(e.target.value)}
                placeholder="e.g. 120" style={inputBase} />
            </Field>
          </div>
        </div>

        {/* Venue */}
        <div style={sectionStyle}>
          <div style={sectionLabel}>Venue</div>
          <div style={grid}>
            <Field label="Venue name" hint="optional">
              <TextInput name="venue_name" value={venueName} onChange={setVenueName} placeholder="e.g. The Savoy" />
            </Field>
            <Field label="Venue postcode" hint="optional">
              <TextInput name="venue_postcode" value={venuePostcode} onChange={setVenuePostcode} placeholder="e.g. SW1A 1AA" />
            </Field>
            <Field label="Venue address" hint="optional" span2>
              <TextInput name="venue_address" value={venueAddress} onChange={setVenueAddress} placeholder="e.g. Strand, London" />
            </Field>
            <Field label="Location" hint="optional">
              <TextInput name="location" value={location} onChange={setLocation} placeholder="e.g. Central London" />
            </Field>
          </div>
        </div>

        {/* Times */}
        <div style={sectionStyle}>
          <div style={sectionLabel}>Times</div>
          <div style={grid}>
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

        {/* Booking details */}
        <div style={sectionStyle}>
          <div style={sectionLabel}>Booking</div>
          <div style={grid}>
            <Field label="Band size requested" hint="optional">
              <TextInput name="band_size_requested" value={bandSizeRequested} onChange={setBandSizeRequested} placeholder="e.g. Quartet" />
            </Field>
            <Field label="Sets requested" hint="optional">
              <TextInput name="sets_requested" value={setsRequested} onChange={setSetsRequested} placeholder="e.g. 2 x 45 mins" />
            </Field>
            <Field label="Booked band size" hint="optional">
              <TextInput name="booked_band_size" value={bookedBandSize} onChange={setBookedBandSize} placeholder="e.g. Quartet" />
            </Field>
            <Field label="Booked sets" hint="optional">
              <TextInput name="booked_sets" value={bookedSets} onChange={setBookedSets} placeholder="e.g. 2 x 45 mins" />
            </Field>
            <Field label="Agreed fee (£)" hint="optional">
              <input name="booked_fee" type="number" min={0} value={bookedFee} onChange={e => setBookedFee(e.target.value)}
                placeholder="e.g. 3500" style={inputBase} />
            </Field>
            <Field label="Dress code" hint="optional">
              <Select name="dress_code_template_id" value={dressCodeTemplateId} onChange={setDressCodeTemplateId}>
                <option value="">Select…</option>
                {dressCodeTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Dress code (from client)" hint="optional">
              <TextInput name="dress_code" value={dressCode} onChange={setDressCode} placeholder="e.g. Black tie" />
            </Field>
            <Field label="Food provided" hint="optional">
              <Select name="food" value={food} onChange={setFood}>
                <option value="">Select…</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="tbc">TBC</option>
              </Select>
            </Field>
            <Field label="Food notes" hint="optional">
              <TextInput name="food_notes" value={foodNotes} onChange={setFoodNotes} placeholder="e.g. Hot meal provided" />
            </Field>
            <Field label="Special requirements" hint="optional" span2>
              <textarea name="special_requirements" value={specialRequirements} onChange={e => setSpecialRequirements(e.target.value)}
                placeholder="e.g. Acoustic set required during dinner"
                rows={3}
                style={{ ...inputBase, resize: 'vertical' }} />
            </Field>
          </div>
        </div>

        {/* Parking & security */}
        <div style={sectionStyle}>
          <div style={sectionLabel}>Parking &amp; security</div>
          <div style={grid}>
            <Field label="ID required" hint="optional">
              <Select name="id_required" value={idRequired} onChange={setIdRequired}>
                <option value="">Select…</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </Field>
          </div>
        </div>

        {/* Source */}
        <div style={sectionStyle}>
          <div style={sectionLabel}>Source</div>
          <div style={grid}>
            <Field label="Booking source" hint="optional">
              <Select name="source" value={source} onChange={setSource}>
                <option value="">Select…</option>
                <option value="Encore">Encore</option>
                <option value="Poptop">Poptop</option>
                <option value="Last Minute Musicians">Last Minute Musicians</option>
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="Other">Other</option>
              </Select>
            </Field>
            <Field label="Job URL" hint="optional">
              <TextInput name="source_job_url" value={sourceJobUrl} onChange={setSourceJobUrl} placeholder="e.g. https://encore.co.uk/…" />
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

      {showStatusPrompt && <ContractStatusModal onSelect={handleStatusSelect} />}
      {duplicates && (
        <DuplicateWarningModal
          matches={duplicates}
          onCancel={() => { setDuplicates(null); pendingFormDataRef.current = null }}
          onConfirm={handleConfirmCreateAnyway}
        />
      )}
    </div>
  )
}
