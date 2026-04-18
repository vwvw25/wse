'use client'

import React, { useState, useTransition } from 'react'
import type { Musician, BandTemplate, BandTemplateSlot, PreferenceOrder } from '@/types/musicians'
import { INSTRUMENTS, musicianFullName } from '@/types/musicians'
import {
  upsertMusician, deleteMusician,
  createBandTemplate, renameBandTemplate, deleteBandTemplate,
  addTemplateSlot, deleteTemplateSlot,
} from './actions'
import { addToPreferenceOrder, removeFromPreferenceOrder, reorderPreference } from './preference-actions'

type Tab = 'roster' | 'templates' | 'preference'

interface Props {
  musicians: Musician[]
  templates: (BandTemplate & { slots: BandTemplateSlot[] })[]
  preferenceOrders: PreferenceOrder[]
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
  const [pending, startTransition] = useTransition()

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
      })
      onClose()
    })
  }

  const canSubmit = firstName.trim().length > 0

  return (
    <Overlay onClose={onClose}>
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

// ── Roster tab ────────────────────────────────────────────────────────────────
function RosterTab({ musicians }: { musicians: Musician[] }) {
  const [modal, setModal] = useState<Partial<Musician> | null | false>(false)
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

// ── Main component ────────────────────────────────────────────────────────────
export default function MusicianClient({ musicians, templates, preferenceOrders }: Props) {
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
        </div>
      </div>

      {tab === 'roster' && <RosterTab musicians={musicians} />}
      {tab === 'templates' && <TemplatesTab templates={templates} />}
      {tab === 'preference' && <PreferenceTab musicians={musicians} preferenceOrders={preferenceOrders} />}
    </div>
  )
}
