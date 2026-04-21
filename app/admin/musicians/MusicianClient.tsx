'use client'

import React, { useState, useTransition } from 'react'
import type { Musician, BandTemplate, BandTemplateSlot, PreferenceOrder, OnboardingType, OnboardingToken } from '@/types/musicians'
import { INSTRUMENTS, musicianFullName, ONBOARDING_OPTIONAL_FIELDS, ONBOARDING_BASE_FIELDS } from '@/types/musicians'
import {
  upsertMusician, deleteMusician,
  createBandTemplate, renameBandTemplate, deleteBandTemplate,
  addTemplateSlot, deleteTemplateSlot,
} from './actions'
import { addToPreferenceOrder, removeFromPreferenceOrder, reorderPreference } from './preference-actions'

type Tab = 'roster' | 'templates' | 'preference' | 'onboarding'

interface Props {
  musicians: Musician[]
  templates: (BandTemplate & { slots: BandTemplateSlot[] })[]
  preferenceOrders: PreferenceOrder[]
  onboardingTokens: OnboardingToken[]
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', height: 34, padding: '0 10px', fontSize: 13, boxSizing: 'border-box',
  background: 'var(--bg-secondary)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none',
}
const cancelBtn: React.CSSProperties = {
  padding: '7px 16px', fontSize: 13, background: 'transparent',
  color: 'var(--text-secondary)', border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
}
const primaryBtn: React.CSSProperties = {
  padding: '7px 18px', fontSize: 13, fontWeight: 500,
  background: 'var(--accent)', color: '#fff', border: 'none',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
}

// ── Overlay ───────────────────────────────────────────────────────────────────
function Overlay({ onClose, children, width = 480 }: { onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg)', borderRadius: 'var(--radius-lg)', padding: 28, width, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ── Instrument select ─────────────────────────────────────────────────────────
function InstrumentSelect({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputStyle }}
    >
      <option value="">{placeholder ?? '— none —'}</option>
      {INSTRUMENTS.map(inst => (
        <option key={inst} value={inst}>{inst}</option>
      ))}
    </select>
  )
}

const DIETARY_OPTIONS = [
  { key: 'lactose_intolerant', label: 'Lactose intolerant' },
  { key: 'gluten_intolerant', label: 'Gluten intolerant' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'vegetarian', label: 'Vegetarian' },
]

// ── Musician modal ────────────────────────────────────────────────────────────
function MusicianModal({ musician, onClose }: { musician: Partial<Musician> | null; onClose: () => void }) {
  const [firstName, setFirstName] = useState(musician?.first_name ?? '')
  const [lastName, setLastName] = useState(musician?.last_name ?? '')
  const [primaryInstrument, setPrimaryInstrument] = useState(musician?.primary_instrument ?? '')
  const [secondaryInstrument, setSecondaryInstrument] = useState(musician?.secondary_instrument ?? '')
  const [email, setEmail] = useState(musician?.email ?? '')
  const [phone, setPhone] = useState(musician?.phone ?? '')
  const [fee, setFee] = useState(String(musician?.default_fee ?? 0))
  const [notes, setNotes] = useState(musician?.notes ?? '')

  // Additional info
  const [homeCity, setHomeCity] = useState(musician?.home_city ?? '')
  const [dietary, setDietary] = useState<Set<string>>(new Set(musician?.dietary_requirements ?? []))

  // Vehicle
  const [carReg, setCarReg] = useState(musician?.car_registration ?? '')
  const [carMake, setCarMake] = useState(musician?.car_make ?? '')
  const [carModel, setCarModel] = useState(musician?.car_model ?? '')
  const [carColour, setCarColour] = useState(musician?.car_colour ?? '')

  // Identity & Health
  const [dob, setDob] = useState(musician?.date_of_birth ?? '')
  const [passport, setPassport] = useState(musician?.passport_number ?? '')
  const [covidVaccinated, setCovidVaccinated] = useState<string>(
    musician?.covid_vaccinated === true ? 'yes' : musician?.covid_vaccinated === false ? 'no' : '',
  )
  const [covidBooster, setCovidBooster] = useState<string>(
    musician?.covid_booster === true ? 'yes' : musician?.covid_booster === false ? 'no' : '',
  )

  const [pending, startTransition] = useTransition()

  function toggleDietary(key: string) {
    setDietary(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await upsertMusician({
        id: musician?.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        primary_instrument: primaryInstrument || null,
        secondary_instrument: secondaryInstrument || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        default_fee: parseFloat(fee) || 0,
        notes: notes.trim() || null,
        home_city: homeCity.trim() || null,
        dietary_requirements: Array.from(dietary),
        car_registration: carReg.trim() || null,
        car_make: carMake.trim() || null,
        car_model: carModel.trim() || null,
        car_colour: carColour.trim() || null,
        date_of_birth: dob || null,
        passport_number: passport.trim() || null,
        covid_vaccinated: covidVaccinated === 'yes' ? true : covidVaccinated === 'no' ? false : null,
        covid_booster: covidBooster === 'yes' ? true : covidBooster === 'no' ? false : null,
      })
      onClose()
    })
  }

  const canSubmit = firstName.trim().length > 0
  const sectionDividerStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase',
    letterSpacing: '0.07em', margin: '8px 0 4px', paddingBottom: 6,
    borderBottom: '0.5px solid var(--border)',
  }

  return (
    <Overlay onClose={onClose} width={560}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
        {musician?.id ? 'Edit musician' : 'Add musician'}
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>First name *</label>
            <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} required autoFocus />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Last name</label>
            <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Primary instrument</label>
            <InstrumentSelect value={primaryInstrument} onChange={setPrimaryInstrument} placeholder="— none —" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Secondary instrument</label>
            <InstrumentSelect value={secondaryInstrument} onChange={setSecondaryInstrument} placeholder="— none —" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Phone</label>
            <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Default fee (£)</label>
          <input style={{ ...inputStyle, width: 140 }} type="number" min="0" step="0.01" value={fee} onChange={e => setFee(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Notes</label>
          <input style={inputStyle} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {/* Additional info */}
        <p style={sectionDividerStyle}>Additional info</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Home city</label>
            <input style={inputStyle} value={homeCity} onChange={e => setHomeCity(e.target.value)} placeholder="e.g. London" />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Dietary requirements</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {DIETARY_OPTIONS.map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={dietary.has(opt.key)}
                  onChange={() => toggleDietary(opt.key)}
                  style={{ width: 14, height: 14 }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Vehicle */}
        <p style={sectionDividerStyle}>Vehicle</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Registration</label>
            <input style={inputStyle} value={carReg} onChange={e => setCarReg(e.target.value)} placeholder="e.g. AB12 CDE" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Make</label>
            <input style={inputStyle} value={carMake} onChange={e => setCarMake(e.target.value)} placeholder="e.g. Ford" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Model</label>
            <input style={inputStyle} value={carModel} onChange={e => setCarModel(e.target.value)} placeholder="e.g. Focus" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Colour</label>
            <input style={inputStyle} value={carColour} onChange={e => setCarColour(e.target.value)} placeholder="e.g. Silver" />
          </div>
        </div>

        {/* Identity & Health */}
        <p style={sectionDividerStyle}>Identity & Health</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Date of birth</label>
            <input style={inputStyle} type="date" value={dob} onChange={e => setDob(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Passport number</label>
            <input style={inputStyle} value={passport} onChange={e => setPassport(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>COVID vaccinated</label>
            <select style={inputStyle} value={covidVaccinated} onChange={e => setCovidVaccinated(e.target.value)}>
              <option value="">Unknown</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>COVID booster</label>
            <select style={inputStyle} value={covidBooster} onChange={e => setCovidBooster(e.target.value)}>
              <option value="">Unknown</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={pending || !canSubmit} style={{ ...primaryBtn, opacity: (pending || !canSubmit) ? 0.5 : 1 }}>
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Overlay>
  )
}

// ── Send onboard modal ────────────────────────────────────────────────────────
function SendOnboardModal({ musician, onClose }: { musician: Musician; onClose: () => void }) {
  const [type, setType] = useState<OnboardingType>('general')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [deadline, setDeadline] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const name = musicianFullName(musician)

  function toggleField(key: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // For general: show optional extras only. For info_request: show all fields.
  const fieldsToShow = type === 'general' ? ONBOARDING_OPTIONAL_FIELDS : [...ONBOARDING_BASE_FIELDS, ...ONBOARDING_OPTIONAL_FIELDS]

  // Group them
  const groups: Record<string, typeof fieldsToShow[number][]> = {}
  for (const field of fieldsToShow) {
    if (!groups[field.group]) groups[field.group] = []
    groups[field.group].push(field)
  }

  const canSend = (type === 'general' || checked.size > 0) && deadline.length > 0

  async function handleSend() {
    setSending(true)
    try {
      await fetch('/api/musicians/send-onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          musicianId: musician.id,
          type,
          fieldsRequested: Array.from(checked),
          deadlineAt: new Date(deadline).toISOString(),
        }),
      })
      setSent(true)
      setTimeout(() => onClose(), 1500)
    } finally {
      setSending(false)
    }
  }

  return (
    <Overlay onClose={onClose} width={520}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Send onboarding email</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{name}</div>

      {/* Type toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {(['general', 'info_request'] as const).map(t => {
          const active = type === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setChecked(new Set()) }}
              style={{
                padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
                background: active ? 'var(--accent)' : 'var(--bg-secondary)',
                color: active ? '#fff' : 'var(--text)',
                border: `0.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                {t === 'general' ? 'General onboard' : 'Information request'}
              </div>
              <div style={{ fontSize: 12, opacity: active ? 0.85 : 0.7, lineHeight: 1.4 }}>
                {t === 'general'
                  ? 'For new musicians. Asks for phone, home city, dietary, instruments, and fee. Tick any additional fields below.'
                  : 'For existing musicians. Only sends the fields you tick.'}
              </div>
            </button>
          )
        })}
      </div>

      {/* Field checkboxes */}
      <div style={{ marginBottom: 20 }}>
        {Object.entries(groups).map(([group, fields]) => (
          <div key={group} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {group}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {fields.map(f => (
                <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={checked.has(f.key)}
                    onChange={() => toggleField(f.key)}
                    style={{ width: 14, height: 14 }}
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Deadline */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          Response deadline *
        </label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          style={{ ...inputStyle, width: 240 }}
          required
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
        <button
          type="button"
          disabled={!canSend || sending || sent}
          onClick={handleSend}
          style={{
            ...primaryBtn,
            opacity: (!canSend || sending || sent) ? 0.5 : 1,
            minWidth: 80,
          }}
        >
          {sent ? 'Sent ✓' : sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </Overlay>
  )
}

// ── Roster tab ────────────────────────────────────────────────────────────────
function RosterTab({ musicians }: { musicians: Musician[] }) {
  const [modal, setModal] = useState<Partial<Musician> | null | false>(false)
  const [onboardModal, setOnboardModal] = useState<Musician | null>(null)
  const [, startTransition] = useTransition()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={primaryBtn} onClick={() => setModal({})}>+ Add musician</button>
      </div>

      {musicians.length === 0 ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          No musicians yet — add your first musician.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Primary', 'Secondary', 'Email', 'Phone', 'Default fee', ''].map((h, i) => (
                <th key={i} style={{ textAlign: 'left', padding: '6px 12px 6px 0', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {musicians.map(m => (
              <tr key={m.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                <td style={{ padding: '9px 12px 9px 0', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{musicianFullName(m)}</td>
                <td style={{ padding: '9px 12px 9px 0', fontSize: 13, color: 'var(--text-secondary)' }}>{m.primary_instrument ?? '—'}</td>
                <td style={{ padding: '9px 12px 9px 0', fontSize: 13, color: 'var(--text-secondary)' }}>{m.secondary_instrument ?? '—'}</td>
                <td style={{ padding: '9px 12px 9px 0', fontSize: 13, color: 'var(--text-secondary)' }}>{m.email ?? '—'}</td>
                <td style={{ padding: '9px 12px 9px 0', fontSize: 13, color: 'var(--text-secondary)' }}>{m.phone ?? '—'}</td>
                <td style={{ padding: '9px 12px 9px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {m.default_fee > 0 ? `£${m.default_fee.toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '9px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => setOnboardModal(m)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', padding: '2px 8px', fontFamily: 'var(--font)' }}
                  >Send onboard</button>
                  <button
                    onClick={() => setModal(m)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', padding: '2px 8px', fontFamily: 'var(--font)' }}
                  >Edit</button>
                  <button
                    onClick={() => { if (confirm(`Remove ${musicianFullName(m)} from roster?`)) startTransition(async () => deleteMusician(m.id)) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-danger)', padding: '2px 8px', fontFamily: 'var(--font)' }}
                  >Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal !== false && (
        <MusicianModal musician={modal} onClose={() => setModal(false)} />
      )}
      {onboardModal && (
        <SendOnboardModal musician={onboardModal} onClose={() => setOnboardModal(null)} />
      )}
    </div>
  )
}

// ── Templates tab ─────────────────────────────────────────────────────────────
function TemplatesTab({ templates }: { templates: (BandTemplate & { slots: BandTemplateSlot[] })[] }) {
  const [newName, setNewName] = useState('')
  const [editingName, setEditingName] = useState<Record<string, string>>({})
  const [newSlot, setNewSlot] = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    startTransition(async () => {
      await createBandTemplate(newName.trim())
      setNewName('')
    })
  }

  return (
    <div>
      <form onSubmit={handleCreateTemplate} style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        <input
          style={{ ...inputStyle, width: 240 }}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Template name, e.g. 3 Piece…"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          style={{ ...primaryBtn, opacity: !newName.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}
        >
          + Add template
        </button>
      </form>

      {templates.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          No templates yet. Create one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {templates.map(t => {
            const nameVal = editingName[t.id] ?? t.name
            const slotVal = newSlot[t.id] ?? ''

            return (
              <div key={t.id} style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)' }}>
                  <input
                    style={{ ...inputStyle, width: 200, height: 30 }}
                    value={nameVal}
                    onChange={e => setEditingName(prev => ({ ...prev, [t.id]: e.target.value }))}
                    onBlur={() => {
                      if (nameVal.trim() && nameVal !== t.name) {
                        startTransition(async () => { await renameBandTemplate(t.id, nameVal) })
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (nameVal.trim() && nameVal !== t.name) startTransition(async () => { await renameBandTemplate(t.id, nameVal) })
                      }
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t.slots.length} slot{t.slots.length !== 1 ? 's' : ''}</span>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => { if (confirm(`Delete template "${t.name}"?`)) startTransition(async () => deleteBandTemplate(t.id)) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-danger)', padding: '2px 8px', fontFamily: 'var(--font)' }}
                  >Delete</button>
                </div>

                <div style={{ padding: '10px 14px' }}>
                  {t.slots.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>No instruments — add one below.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {t.slots.map(slot => (
                        <div key={slot.id} style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px 3px 10px', borderRadius: 20, fontSize: 12,
                          background: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)',
                        }}>
                          {slot.instrument}
                          <button
                            onClick={() => { if (confirm(`Remove "${slot.instrument}" from template?`)) startTransition(async () => deleteTemplateSlot(slot.id)) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-tertiary)', padding: '0 2px', lineHeight: 1 }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={slotVal}
                      onChange={e => setNewSlot(prev => ({ ...prev, [t.id]: e.target.value }))}
                      style={{ ...inputStyle, width: 180, height: 30 }}
                    >
                      <option value="">Add instrument…</option>
                      {INSTRUMENTS.map(inst => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (!slotVal) return
                        startTransition(async () => { await addTemplateSlot(t.id, slotVal) })
                        setNewSlot(prev => ({ ...prev, [t.id]: '' }))
                      }}
                      disabled={!slotVal}
                      style={{
                        padding: '0 12px', fontSize: 13, height: 30,
                        background: 'var(--bg-secondary)', color: 'var(--text)',
                        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer', fontFamily: 'var(--font)',
                        opacity: !slotVal ? 0.5 : 1,
                      }}
                    >Add</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Preference orders tab ─────────────────────────────────────────────────────
function PreferenceTab({ musicians, preferenceOrders }: { musicians: Musician[]; preferenceOrders: PreferenceOrder[] }) {
  const [selectedInstrument, setSelectedInstrument] = useState<string>(INSTRUMENTS[0])
  const [addMusician, setAddMusician] = useState('')
  const [, startTransition] = useTransition()

  const orderForInstrument = preferenceOrders
    .filter(p => p.instrument === selectedInstrument)
    .sort((a, b) => a.rank - b.rank)

  const assignedIds = new Set(orderForInstrument.map(p => p.musician_id))
  const available = musicians.filter(m => !assignedIds.has(m.id))

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, marginTop: 0 }}>
        Set a ranked preference order per instrument. When a musician declines, the next in the list is automatically contacted.
      </p>

      {/* Instrument picker */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {INSTRUMENTS.map(inst => {
          const count = preferenceOrders.filter(p => p.instrument === inst).length
          const active = inst === selectedInstrument
          return (
            <button
              key={inst}
              onClick={() => { setSelectedInstrument(inst); setAddMusician('') }}
              style={{
                padding: '5px 12px', fontSize: 12, borderRadius: 20, cursor: 'pointer',
                fontFamily: 'var(--font)', border: '0.5px solid var(--border)',
                background: active ? 'var(--accent)' : 'var(--bg-secondary)',
                color: active ? '#fff' : 'var(--text-secondary)',
                fontWeight: active ? 500 : 400,
              }}
            >
              {inst}{count > 0 ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {/* Ranked list for selected instrument */}
      <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxWidth: 480 }}>
        <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          {selectedInstrument} — preference order
        </div>

        {orderForInstrument.length === 0 ? (
          <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-tertiary)' }}>
            No preference order set for {selectedInstrument}.
          </div>
        ) : (
          <div>
            {orderForInstrument.map((p, i) => {
              const m = musicians.find(mu => mu.id === p.musician_id)
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderBottom: '0.5px solid var(--border)',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', width: 20, textAlign: 'center' }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>
                    {m ? musicianFullName(m) : 'Unknown'}
                  </span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button
                      disabled={i === 0}
                      onClick={() => {
                        const ids = orderForInstrument.map(x => x.musician_id)
                        ;[ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]
                        startTransition(async () => { await reorderPreference(selectedInstrument, ids) })
                      }}
                      style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', fontSize: 13, color: i === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)', padding: '0 4px', fontFamily: 'var(--font)', opacity: i === 0 ? 0.3 : 1 }}
                    >↑</button>
                    <button
                      disabled={i === orderForInstrument.length - 1}
                      onClick={() => {
                        const ids = orderForInstrument.map(x => x.musician_id)
                        ;[ids[i], ids[i + 1]] = [ids[i + 1], ids[i]]
                        startTransition(async () => { await reorderPreference(selectedInstrument, ids) })
                      }}
                      style={{ background: 'none', border: 'none', cursor: i === orderForInstrument.length - 1 ? 'default' : 'pointer', fontSize: 13, color: i === orderForInstrument.length - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)', padding: '0 4px', fontFamily: 'var(--font)', opacity: i === orderForInstrument.length - 1 ? 0.3 : 1 }}
                    >↓</button>
                    <button
                      onClick={() => { if (confirm(`Remove ${m ? musicianFullName(m) : 'this musician'} from ${selectedInstrument} order?`)) startTransition(async () => { await removeFromPreferenceOrder(p.id) }) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-danger)', padding: '0 4px', fontFamily: 'var(--font)' }}
                    >✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add musician to order */}
        <div style={{ padding: '10px 14px', display: 'flex', gap: 6 }}>
          <select
            value={addMusician}
            onChange={e => setAddMusician(e.target.value)}
            style={{ ...inputStyle, flex: 1, height: 32 }}
          >
            <option value="">Add musician to order…</option>
            {available.map(m => (
              <option key={m.id} value={m.id}>{musicianFullName(m)}</option>
            ))}
          </select>
          <button
            disabled={!addMusician}
            onClick={() => {
              if (!addMusician) return
              startTransition(async () => { await addToPreferenceOrder(selectedInstrument, addMusician) })
              setAddMusician('')
            }}
            style={{
              padding: '0 12px', height: 32, fontSize: 13,
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontFamily: 'var(--font)',
              opacity: !addMusician ? 0.5 : 1,
            }}
          >Add</button>
        </div>
      </div>
    </div>
  )
}

// ── Onboarding tab ────────────────────────────────────────────────────────────
function OnboardingTab({ tokens, musicians }: { tokens: OnboardingToken[]; musicians: Musician[] }) {
  function getStatus(t: OnboardingToken): { label: string; color: string } {
    if (t.completed_at) return { label: 'Complete', color: '#16a34a' }
    if (t.reminder_2_sent_at) return { label: 'Reminder 2 sent', color: '#d97706' }
    if (t.reminder_1_sent_at) return { label: 'Reminder 1 sent', color: '#ca8a04' }
    return { label: 'Sent', color: '#6b7280' }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div>
      {tokens.length === 0 ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          No onboarding requests sent yet.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Musician', 'Type', 'Sent', 'Deadline', 'Status'].map((h, i) => (
                <th key={i} style={{ textAlign: 'left', padding: '6px 12px 6px 0', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tokens.map(t => {
              const m = t.musician as { first_name: string; last_name: string } | null
              const name = m ? [m.first_name, m.last_name].filter(Boolean).join(' ') : '—'
              const status = getStatus(t)
              const isPastDeadline = !t.completed_at && new Date(t.deadline_at) < new Date()
              return (
                <tr key={t.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <td style={{ padding: '9px 12px 9px 0', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{name}</td>
                  <td style={{ padding: '9px 12px 9px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {t.type === 'general' ? 'General' : 'Info request'}
                  </td>
                  <td style={{ padding: '9px 12px 9px 0', fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(t.created_at)}</td>
                  <td style={{ padding: '9px 12px 9px 0', fontSize: 13, color: isPastDeadline ? '#dc2626' : 'var(--text-secondary)' }}>
                    {formatDate(t.deadline_at)}
                  </td>
                  <td style={{ padding: '9px 0', fontSize: 13 }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                      fontSize: 12, fontWeight: 500, color: status.color,
                      background: `${status.color}18`,
                    }}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MusicianClient({ musicians, templates, preferenceOrders, onboardingTokens }: Props) {
  const [tab, setTab] = useState<Tab>('roster')

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px', fontSize: 13, fontWeight: active ? 600 : 400,
    background: active ? 'var(--bg)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-secondary)',
    border: active ? '0.5px solid var(--border)' : '0.5px solid transparent',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
  })

  return (
    <div style={{ padding: '24px 32px', maxWidth: 920 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', padding: 3, borderRadius: 'var(--radius-sm)' }}>
          <button style={tabStyle(tab === 'roster')} onClick={() => setTab('roster')}>
            Roster ({musicians.length})
          </button>
          <button style={tabStyle(tab === 'templates')} onClick={() => setTab('templates')}>
            Band templates ({templates.length})
          </button>
          <button style={tabStyle(tab === 'preference')} onClick={() => setTab('preference')}>
            Preference orders
          </button>
          <button style={tabStyle(tab === 'onboarding')} onClick={() => setTab('onboarding')}>
            Onboarding ({onboardingTokens.length})
          </button>
        </div>
      </div>

      {tab === 'roster' && <RosterTab musicians={musicians} />}
      {tab === 'templates' && <TemplatesTab templates={templates} />}
      {tab === 'preference' && <PreferenceTab musicians={musicians} preferenceOrders={preferenceOrders} />}
      {tab === 'onboarding' && <OnboardingTab tokens={onboardingTokens} musicians={musicians} />}
    </div>
  )
}
