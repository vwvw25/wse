'use client'

import React, { useState, useTransition } from 'react'
import type { EventMusician, Musician, BandTemplate, BandTemplateSlot, MusicianAvailability } from '@/types/musicians'
import { musicianFullName } from '@/types/musicians'
import {
  applyTemplateToEvent,
  addEventMusicianSlot,
  assignMusicianToSlot,
  updateSlotAvailability,
  updateSlotFees,
  updateSlotDeadline,
  removeEventMusicianSlot,
} from './actions'

interface Props {
  eventId: string
  eventLabel: string
  slots: EventMusician[]
  musicians: Musician[]
  templates: (BandTemplate & { slots: BandTemplateSlot[] })[]
}

const inputStyle: React.CSSProperties = {
  height: 32, padding: '0 8px', fontSize: 13, boxSizing: 'border-box',
  background: 'var(--bg-secondary)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none',
}

const AVAILABILITY_CONFIG = {
  yes:            { label: 'Confirmed',      color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  no:             { label: 'Unavailable',    color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  tbc:            { label: 'TBC',            color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  email_sent:     { label: 'Invite sent',    color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  reminder_sent:  { label: 'Reminder sent', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
}

// ── Availability badge ────────────────────────────────────────────────────────
function AvailabilityBadge({ value, onChange }: { value: MusicianAvailability; onChange: (v: MusicianAvailability) => void }) {
  const cfg = AVAILABILITY_CONFIG[value]
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          padding: '3px 8px', fontSize: 12, fontWeight: 500,
          borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font)',
          background: cfg.bg, color: cfg.color,
          border: `0.5px solid ${cfg.border}`,
        }}
      >
        {cfg.label} ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 2,
          background: 'var(--bg)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          minWidth: 130, overflow: 'hidden',
        }}>
          {(Object.entries(AVAILABILITY_CONFIG) as [typeof value, typeof cfg][]).map(([k, c]) => (
            <button
              key={k}
              onClick={() => { onChange(k); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 12px', fontSize: 12, cursor: 'pointer',
                background: k === value ? 'var(--bg-secondary)' : 'transparent',
                color: c.color, fontFamily: 'var(--font)', border: 'none',
                fontWeight: k === value ? 600 : 400,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const DEADLINE_OPTIONS = [6, 12, 24, 48]

// ── Email status badge (read-only) ────────────────────────────────────────────
const EMAIL_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  '—':        { label: '—',          color: 'var(--text-tertiary)', bg: 'transparent' },
  sent:       { label: 'Sent',       color: '#1d4ed8', bg: '#eff6ff' },
  delivered:  { label: 'Delivered',  color: '#16a34a', bg: '#f0fdf4' },
  accepted:   { label: 'Accepted',   color: '#16a34a', bg: '#f0fdf4' },
  declined:   { label: 'Declined',   color: '#dc2626', bg: '#fef2f2' },
  replied:    { label: 'Replied',    color: '#92400e', bg: '#fffbeb' },
  failed:     { label: 'Failed',     color: '#dc2626', bg: '#fef2f2' },
}

function EmailStatusBadge({ value }: { value: string }) {
  const cfg = EMAIL_STATUS_CONFIG[value] ?? EMAIL_STATUS_CONFIG['—']
  if (value === '—') return <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 4,
      fontSize: 11, fontWeight: 500, background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  )
}

// ── Musician slot row ─────────────────────────────────────────────────────────
function SlotRow({
  slot,
  musicians,
  eventId,
}: {
  slot: EventMusician
  musicians: Musician[]
  eventId: string
}) {
  const [editing, setEditing] = useState(false)
  const [fee, setFee] = useState(String(slot.fee))
  const [extra, setExtra] = useState(String(slot.additional_costs))
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const total = (parseFloat(fee) || 0) + (parseFloat(extra) || 0)
  const emailSentAt = slot.email_sent_at ? new Date(slot.email_sent_at) : null
  const canSend = !!slot.musician_id

  function handleMusicianChange(musicianId: string) {
    const musician = musicians.find(m => m.id === musicianId)
    const newFee = musician ? musician.default_fee : 0
    setFee(String(newFee))
    startTransition(async () => {
      await assignMusicianToSlot(slot.id, eventId, musicianId || null, newFee)
    })
  }

  function handleAvailability(v: MusicianAvailability) {
    startTransition(async () => {
      await updateSlotAvailability(slot.id, eventId, v)
    })
  }

  function handleSaveFees() {
    startTransition(async () => {
      await updateSlotFees(slot.id, eventId, parseFloat(fee) || 0, parseFloat(extra) || 0)
      setEditing(false)
    })
  }

  function handleDeadlineChange(hours: number) {
    startTransition(async () => {
      await updateSlotDeadline(slot.id, eventId, hours)
    })
  }

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch('/api/musicians/send-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: slot.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSendError(data.error ?? 'Failed to send')
      } else {
        // Refresh page to show updated email_sent_at
        window.location.reload()
      }
    } catch {
      setSendError('Network error')
    } finally {
      setSending(false)
    }
  }

  const dateStr = new Date(slot.date_added).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
      {/* Musician name / assign */}
      <td style={{ padding: '10px 12px 10px 0' }}>
        <select
          value={slot.musician_id ?? ''}
          onChange={e => handleMusicianChange(e.target.value)}
          style={{ ...inputStyle, width: 160 }}
        >
          <option value="">— unassigned —</option>
          {musicians.map(m => (
            <option key={m.id} value={m.id}>{musicianFullName(m)}</option>
          ))}
        </select>
      </td>
      {/* Instrument */}
      <td style={{ padding: '10px 12px 10px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
        {slot.instrument}
      </td>
      {/* Date added */}
      <td style={{ padding: '10px 12px 10px 0', fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
        {dateStr}
      </td>
      {/* Availability */}
      <td style={{ padding: '10px 12px 10px 0' }}>
        <AvailabilityBadge value={slot.availability} onChange={handleAvailability} />
      </td>
      {/* Invite status */}
      <td style={{ padding: '10px 12px 10px 0' }}>
        <EmailStatusBadge value={slot.invite_status ?? '—'} />
      </td>
      {/* Reminder status */}
      <td style={{ padding: '10px 12px 10px 0' }}>
        <EmailStatusBadge value={slot.reminder_status ?? '—'} />
      </td>
      {/* Deadline */}
      <td style={{ padding: '10px 12px 10px 0' }}>
        <select
          value={slot.deadline_hours ?? 24}
          onChange={e => handleDeadlineChange(Number(e.target.value))}
          style={{ ...inputStyle, width: 72 }}
        >
          {DEADLINE_OPTIONS.map(h => (
            <option key={h} value={h}>{h}h</option>
          ))}
        </select>
      </td>
      {/* Email status + Send */}
      <td style={{ padding: '10px 12px 10px 0', whiteSpace: 'nowrap' }}>
        {emailSentAt ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>
              ✓ Sent {emailSentAt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
            </span>
            <button
              onClick={handleSend}
              disabled={!canSend || sending}
              style={{
                padding: '2px 8px', fontSize: 11, cursor: canSend ? 'pointer' : 'not-allowed',
                background: 'none', color: 'var(--text-tertiary)',
                border: '0.5px solid var(--border)', borderRadius: 3,
                fontFamily: 'var(--font)', opacity: canSend ? 1 : 0.4,
              }}
            >
              Resend
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button
              onClick={handleSend}
              disabled={!canSend || sending}
              style={{
                padding: '4px 10px', fontSize: 12, fontWeight: 500,
                cursor: canSend ? 'pointer' : 'not-allowed',
                background: canSend ? '#111827' : 'var(--bg-secondary)',
                color: canSend ? '#fff' : 'var(--text-tertiary)',
                border: '0.5px solid var(--border)', borderRadius: 4,
                fontFamily: 'var(--font)', opacity: sending ? 0.6 : 1,
              }}
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
            {sendError && <span style={{ fontSize: 11, color: '#dc2626' }}>{sendError}</span>}
          </div>
        )}
      </td>
      {/* Fee */}
      <td style={{ padding: '10px 12px 10px 0' }}>
        {editing ? (
          <input
            style={{ ...inputStyle, width: 80 }}
            type="number" min="0" step="0.01"
            value={fee} onChange={e => setFee(e.target.value)}
          />
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text)' }}>£{(parseFloat(fee) || 0).toFixed(2)}</span>
        )}
      </td>
      {/* Additional costs */}
      <td style={{ padding: '10px 12px 10px 0' }}>
        {editing ? (
          <input
            style={{ ...inputStyle, width: 80 }}
            type="number" min="0" step="0.01"
            value={extra} onChange={e => setExtra(e.target.value)}
          />
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text)' }}>£{(parseFloat(extra) || 0).toFixed(2)}</span>
        )}
      </td>
      {/* Total fee */}
      <td style={{ padding: '10px 12px 10px 0', fontSize: 13, color: 'var(--accent)', fontWeight: 500, whiteSpace: 'nowrap' }}>
        £{total.toFixed(2)}
      </td>
      {/* Actions */}
      <td style={{ padding: '10px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {editing ? (
          <>
            <button
              onClick={handleSaveFees}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', padding: '2px 6px', fontFamily: 'var(--font)' }}
            >Save</button>
            <button
              onClick={() => { setFee(String(slot.fee)); setExtra(String(slot.additional_costs)); setEditing(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', padding: '2px 6px', fontFamily: 'var(--font)' }}
            >Cancel</button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', padding: '2px 6px', fontFamily: 'var(--font)' }}
            >Edit fees</button>
            <button
              onClick={() => { if (confirm(`Remove ${slot.instrument} slot?`)) startTransition(async () => removeEventMusicianSlot(slot.id, eventId)) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-danger)', padding: '2px 6px', fontFamily: 'var(--font)' }}
            >✕</button>
          </>
        )}
      </td>
    </tr>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EventMusiciansClient({ eventId, eventLabel, slots, musicians, templates }: Props) {
  const [addInstrument, setAddInstrument] = useState('')
  const [, startTransition] = useTransition()

  const totalFee = slots.reduce((sum, s) => sum + s.fee + s.additional_costs, 0)

  // Summary grid at top — booked musicians per instrument
  const bookedSlots = slots.filter(s => s.musician_id)
  const missingSlots = slots.filter(s => !s.musician_id)

  function handleApplyTemplate(templateId: string) {
    if (!templateId) return
    startTransition(async () => {
      await applyTemplateToEvent(eventId, templateId)
    })
  }

  function handleAddSlot(e: React.FormEvent) {
    e.preventDefault()
    const val = addInstrument.trim()
    if (!val) return
    startTransition(async () => {
      await addEventMusicianSlot(eventId, val)
      setAddInstrument('')
    })
  }

  return (
    <div>
      {/* Band lineup summary */}
      {slots.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 0,
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
          overflow: 'hidden', marginBottom: 24,
        }}>
          {slots.map((slot, i) => {
            const found = slot.musician_id ? musicians.find(m => m.id === slot.musician_id) : null
            const musicianName = found ? musicianFullName(found) : null
            const avail = slot.availability
            const color = avail === 'yes' ? '#16a34a' : avail === 'no' ? '#dc2626' : 'var(--text-secondary)'
            return (
              <div key={slot.id} style={{
                flex: '1 1 120px', padding: '12px 16px', textAlign: 'center',
                borderRight: i < slots.length - 1 ? '0.5px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  {slot.instrument}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: musicianName ? color : 'var(--text-danger)' }}>
                  {musicianName ?? 'MISSING'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Controls: apply template + add slot */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {templates.length > 0 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Apply template:</span>
            <select
              style={{ ...inputStyle, width: 160 }}
              defaultValue=""
              onChange={e => { handleApplyTemplate(e.target.value); e.target.value = '' }}
            >
              <option value="" disabled>Choose template…</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.slots.length} slots)</option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleAddSlot} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            style={{ ...inputStyle, width: 160 }}
            value={addInstrument}
            onChange={e => setAddInstrument(e.target.value)}
            placeholder="Add instrument slot…"
          />
          <button
            type="submit"
            disabled={!addInstrument.trim()}
            style={{
              padding: '0 14px', height: 32, fontSize: 13,
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontFamily: 'var(--font)',
              opacity: !addInstrument.trim() ? 0.5 : 1,
            }}
          >Add slot</button>
        </form>
      </div>

      {/* Slot table */}
      {slots.length === 0 ? (
        <div style={{
          padding: '40px 24px', textAlign: 'center',
          color: 'var(--text-tertiary)', fontSize: 13,
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
        }}>
          No musician slots yet.{templates.length > 0 ? ' Apply a template or add slots individually above.' : ' Add slots individually above.'}
        </div>
      ) : (
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                {['Musician', 'Instrument', 'Date added', 'Available', 'Invite', 'Reminder', 'Deadline', 'Email', 'Fee', 'Additional costs', 'Total fee', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '8px 12px 8px 0', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', paddingLeft: i === 0 ? 16 : 0 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map(slot => (
                <SlotRow key={slot.id} slot={slot} musicians={musicians} eventId={eventId} />
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <td colSpan={8} style={{ padding: '8px 12px 8px 16px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Totals</td>
                <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>£{totalFee.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Status summary */}
      {slots.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={{ color: '#16a34a' }}>✓ {slots.filter(s => s.availability === 'yes').length} confirmed</span>
          <span style={{ color: '#dc2626' }}>✗ {slots.filter(s => s.availability === 'no').length} unavailable</span>
          <span style={{ color: '#92400e' }}>◌ {slots.filter(s => s.availability === 'tbc').length} TBC</span>
          {missingSlots.length > 0 && (
            <span style={{ color: 'var(--text-danger)', fontWeight: 500 }}>⚠ {missingSlots.length} unassigned</span>
          )}
        </div>
      )}
    </div>
  )
}
