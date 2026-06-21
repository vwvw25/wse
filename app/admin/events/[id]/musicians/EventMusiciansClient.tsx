'use client'

import React, { useState, useTransition } from 'react'
import type { EventMusician, Musician, BandTemplate, BandTemplateSlot, CascadeTemplate, MusicianInvite } from '@/types/musicians'
import { musicianFullName, INSTRUMENTS } from '@/types/musicians'
import {
  applyTemplateToEvent,
  addEventMusicianSlot,
  assignMusicianToSlot,
  updateSlotFees,
  updateSlotDeadline,
  updateSlotAvailability,
  updateSlotCascadeTemplate,
  updateSlotCascadeEnabled,
  removeEventMusicianSlot,
} from './actions'

interface Props {
  eventId: string
  eventLabel: string
  eventFood: 'yes' | 'no' | 'tbc' | null
  slots: EventMusician[]
  musicians: Musician[]
  templates: (BandTemplate & { slots: BandTemplateSlot[] })[]
  cascadeTemplates?: CascadeTemplate[]
}

const inputStyle: React.CSSProperties = {
  height: 32, padding: '0 8px', fontSize: 13, boxSizing: 'border-box',
  background: 'var(--bg-secondary)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none',
}

const DEADLINE_OPTIONS = [6, 12, 24, 48]

// ── Email status badge (read-only) ────────────────────────────────────────────
const EMAIL_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  '—':         { label: '—',          color: 'var(--text-tertiary)', bg: 'transparent' },
  sent:        { label: 'Sent',       color: '#1d4ed8', bg: '#eff6ff' },
  delivered:   { label: 'Sent',       color: '#1d4ed8', bg: '#eff6ff' },
  clicked:     { label: 'Viewed',     color: '#92400e', bg: '#fffbeb' },
  accepted:    { label: 'Accepted',   color: '#16a34a', bg: '#f0fdf4' },
  declined:    { label: 'Declined',   color: '#dc2626', bg: '#fef2f2' },
  failed:      { label: 'Failed',     color: '#dc2626', bg: '#fef2f2' },
  bounced:     { label: 'Bounced',    color: '#dc2626', bg: '#fef2f2' },
  complained:  { label: 'Complained', color: '#ea580c', bg: '#fff7ed' },
}

// Derive what to show in Invite/Reminder columns from invite record.
// requiresSent: if true (reminder column), only show accepted/declined if the email was actually sent
function resolveStatus(inviteAvailability: string | null, rawStatus: string | null, linkClickedAt?: string | null, requiresSent = false): string {
  const wasSent = requiresSent ? (rawStatus !== null && rawStatus !== '—') : true
  if (wasSent && inviteAvailability === 'yes') return 'accepted'
  if (wasSent && inviteAvailability === 'no') return 'declined'
  if (!requiresSent && linkClickedAt) return 'clicked'
  return rawStatus ?? '—'
}

function EmailStatusBadge({ value }: { value: string }) {
  const cfg = EMAIL_STATUS_CONFIG[value] ?? { label: value, color: '#6b7280', bg: '#f3f4f6' }
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
  eventFood,
  cascadeTemplates,
}: {
  slot: EventMusician
  musicians: Musician[]
  eventId: string
  eventFood: 'yes' | 'no' | 'tbc' | null
  cascadeTemplates: CascadeTemplate[]
}) {
  const [editing, setEditing] = useState(false)
  const [fee, setFee] = useState(String(slot.fee))
  const [extra, setExtra] = useState(String(slot.additional_costs))
  const [confirming, setConfirming] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [availUpdating, setAvailUpdating] = useState(false)
  const [, startTransition] = useTransition()

  const total = (parseFloat(fee) || 0) + (parseFloat(extra) || 0)
  const invite = slot.latest_invite ?? null
  const emailSentAt = invite?.email_sent_at ? new Date(invite.email_sent_at) : null
  const canSend = !!slot.musician_id

  const slotInstrument = slot.instrument.toLowerCase()
  const filteredMusicians = musicians.filter(m => {
    const primary = m.primary_instrument?.toLowerCase()
    const secondary = m.secondary_instrument?.toLowerCase()
    return primary === slotInstrument || secondary === slotInstrument
  })
  // Always include the currently assigned musician even if they don't match
  const musicianOptions = slot.musician_id && !filteredMusicians.find(m => m.id === slot.musician_id)
    ? [...filteredMusicians, musicians.find(m => m.id === slot.musician_id)!]
    : filteredMusicians

  function handleMusicianChange(musicianId: string) {
    const musician = musicians.find(m => m.id === musicianId)
    const newFee = musician ? musician.default_fee : 0
    setFee(String(newFee))
    startTransition(async () => {
      await assignMusicianToSlot(slot.id, eventId, musicianId || null, newFee)
    })
  }

  function handleSaveFees() {
    // Open the confirmation dialog
    setConfirmInput('')
    setConfirmError(null)
    setConfirming(true)
  }

  function handleConfirmSave() {
    const enteredFee = parseFloat(confirmInput)
    const expectedFee = parseFloat(fee) || 0
    if (isNaN(enteredFee) || Math.round(enteredFee * 100) !== Math.round(expectedFee * 100)) {
      setConfirmError('Amount does not match. Please enter the exact fee amount.')
      return
    }
    setConfirming(false)
    startTransition(async () => {
      await updateSlotFees(slot.id, eventId, expectedFee, parseFloat(extra) || 0)
      setEditing(false)
    })
  }

  function handleDeadlineChange(hours: number) {
    startTransition(async () => {
      await updateSlotDeadline(slot.id, eventId, hours)
    })
  }

  function handleCascadeTemplateChange(templateId: string) {
    startTransition(async () => {
      await updateSlotCascadeTemplate(slot.id, eventId, templateId || null)
    })
  }

  function handleCascadeEnabledChange(enabled: boolean) {
    startTransition(async () => {
      await updateSlotCascadeEnabled(slot.id, eventId, enabled)
    })
  }

  const templatesForInstrument = cascadeTemplates.filter(
    t => t.instrument.toLowerCase() === slot.instrument.toLowerCase()
  )

  async function handleAvailabilityChange(value: string) {
    setAvailUpdating(true)
    await updateSlotAvailability(slot.id, eventId, value as 'yes' | 'no' | 'tbc')
    setAvailUpdating(false)
  }

  async function handleSend() {
    if (!canSend) return
    if (eventFood === null) {
      setSendError('Please set the food status for this event before sending invites.')
      return
    }
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
      <td style={{ padding: '10px 12px 10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <select
            value={slot.musician_id ?? ''}
            onChange={e => handleMusicianChange(e.target.value)}
            style={{ ...inputStyle, width: 150 }}
          >
            <option value="">— unassigned —</option>
            {musicianOptions.map(m => (
              <option key={m.id} value={m.id}>{musicianFullName(m)}</option>
            ))}
          </select>
          {slot.musician_id && (
            <button
              onClick={() => handleMusicianChange('')}
              title="Remove musician"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, color: 'var(--text-tertiary)', padding: '0 2px',
                lineHeight: 1, fontFamily: 'var(--font)',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </td>
      {/* Instrument */}
      <td style={{ padding: '10px 12px 10px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
        {slot.instrument}
      </td>
      {/* Date added */}
      <td style={{ padding: '10px 12px 10px 0', fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
        {dateStr}
      </td>
      {/* Invite status */}
      <td style={{ padding: '10px 12px 10px 0' }}>
        <EmailStatusBadge value={resolveStatus(invite?.availability ?? null, invite?.invite_status ?? null, invite?.link_clicked_at)} />
      </td>
      {/* Reminder status */}
      <td style={{ padding: '10px 12px 10px 0' }}>
        <EmailStatusBadge value={resolveStatus(invite?.availability ?? null, invite?.reminder_status ?? null, undefined, true)} />
      </td>
      {/* Response (manual override) */}
      <td style={{ padding: '10px 12px 10px 0' }}>
        <select
          value={slot.availability}
          onChange={e => handleAvailabilityChange(e.target.value)}
          disabled={availUpdating}
          style={{
            ...inputStyle, width: 90,
            opacity: availUpdating ? 0.5 : 1,
            color: slot.availability === 'yes' ? '#16a34a' : slot.availability === 'no' ? '#dc2626' : undefined,
            fontWeight: slot.availability === 'yes' || slot.availability === 'no' ? 600 : undefined,
          }}
        >
          <option value="tbc">TBC</option>
          <option value="yes">✓ Yes</option>
          <option value="no">✗ No</option>
        </select>
      </td>
      {/* Deadline */}
      <td style={{ padding: '10px 12px 10px 0' }}>
        <select
          value={slot.deadline_hours}
          onChange={e => handleDeadlineChange(Number(e.target.value))}
          style={{ ...inputStyle, width: 72 }}
        >
          {DEADLINE_OPTIONS.map(h => (
            <option key={h} value={h}>{h}h</option>
          ))}
        </select>
      </td>
      {/* Cascade template */}
      <td style={{ padding: '10px 12px 10px 0' }}>
        <select
          value={slot.cascade_template_id ?? ''}
          onChange={e => handleCascadeTemplateChange(e.target.value)}
          style={{ ...inputStyle, width: 130, fontSize: 11 }}
          title={templatesForInstrument.length === 0 ? `No cascade templates for ${slot.instrument}` : undefined}
        >
          <option value="">— none —</option>
          {templatesForInstrument.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </td>
      {/* Cascade enabled toggle */}
      <td style={{ padding: '10px 12px 10px 0' }}>
        <div
          onClick={() => handleCascadeEnabledChange(!slot.cascade_enabled)}
          title={slot.cascade_enabled ? 'Auto-cascade on — click to disable' : 'Manual mode — click to enable auto-cascade'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            cursor: 'pointer', userSelect: 'none', padding: '3px 7px',
            borderRadius: 4, fontSize: 11, fontWeight: 500,
            background: slot.cascade_enabled ? '#f0fdf4' : 'var(--bg-secondary)',
            color: slot.cascade_enabled ? '#16a34a' : 'var(--text-tertiary)',
            border: `0.5px solid ${slot.cascade_enabled ? '#bbf7d0' : 'var(--border)'}`,
          }}
        >
          {slot.cascade_enabled ? '↓ Auto' : '◎ Manual'}
        </div>
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
      <td style={{ padding: '10px 16px 10px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
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

      {/* Fee confirmation modal */}
      {confirming && (
        <td colSpan={0} style={{ padding: 0, border: 'none' }}>
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
            onClick={e => { if (e.target === e.currentTarget) { setConfirming(false) } }}
          >
            <div style={{
              background: 'var(--bg)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '28px 32px', maxWidth: 360, width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Confirm fee amount</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 18px' }}>
                Type <strong>£{(parseFloat(fee) || 0).toFixed(2)}</strong> to confirm and save.
              </p>
              <input
                autoFocus
                style={{ ...inputStyle, width: '100%', marginBottom: 8 }}
                type="number"
                min="0"
                step="0.01"
                placeholder={`${(parseFloat(fee) || 0).toFixed(2)}`}
                value={confirmInput}
                onChange={e => { setConfirmInput(e.target.value); setConfirmError(null) }}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirmSave(); if (e.key === 'Escape') setConfirming(false) }}
              />
              {confirmError && (
                <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{confirmError}</div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  onClick={() => setConfirming(false)}
                  style={{ padding: '7px 16px', fontSize: 13, cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)' }}
                >Cancel</button>
                <button
                  onClick={handleConfirmSave}
                  style={{ padding: '7px 16px', fontSize: 13, cursor: 'pointer', background: 'var(--accent)', color: 'var(--accent-text-on)', border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)', fontWeight: 500 }}
                >Confirm &amp; save</button>
              </div>
            </div>
          </div>
        </td>
      )}
    </tr>
  )
}

// ── History tab ───────────────────────────────────────────────────────────────
function HistoryTab({ slots, musicians }: { slots: EventMusician[]; musicians: Musician[] }) {
  const OUTCOME_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    no:               { label: 'Declined',         color: '#dc2626', bg: '#fef2f2' },
    deadline_expired: { label: 'No response',      color: '#92400e', bg: '#fffbeb' },
  }

  // Collect all historical invites (declined or deadline_expired) across all slots
  const rows: { slot: EventMusician; invite: MusicianInvite; musician: Musician | undefined }[] = []
  for (const slot of slots) {
    const allInvites = slot.invites ?? []
    for (const invite of allInvites) {
      if (invite.availability === 'no' || invite.availability === 'deadline_expired') {
        // Only show if this invite is NOT the current active musician (already shown in active tab)
        if (invite.musician_id !== slot.musician_id || slot.availability === 'no') {
          const musician = musicians.find(m => m.id === invite.musician_id)
          rows.push({ slot, invite, musician })
        }
      }
    }
  }

  // Sort by email_sent_at descending
  rows.sort((a, b) => {
    const ta = a.invite.email_sent_at ?? a.invite.created_at
    const tb = b.invite.email_sent_at ?? b.invite.created_at
    return new Date(tb).getTime() - new Date(ta).getTime()
  })

  if (rows.length === 0) {
    return (
      <div style={{
        padding: '40px 24px', textAlign: 'center',
        color: 'var(--text-tertiary)', fontSize: 13,
        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
      }}>
        No declined or non-responsive invites yet.
      </div>
    )
  }

  function fmt(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            {['Instrument', 'Musician', 'Invited', 'Responded', 'Outcome'].map((h, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '8px 12px 8px 0', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', paddingLeft: i === 0 ? 16 : 0 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ slot, invite, musician }) => {
            const cfg = OUTCOME_LABELS[invite.availability] ?? OUTCOME_LABELS['no']
            return (
              <tr key={invite.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                <td style={{ padding: '10px 12px 10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{slot.instrument}</td>
                <td style={{ padding: '10px 12px 10px 0', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                  {musician ? musicianFullName(musician) : '—'}
                </td>
                <td style={{ padding: '10px 12px 10px 0', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {fmt(invite.email_sent_at)}
                </td>
                <td style={{ padding: '10px 12px 10px 0', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {fmt(invite.link_clicked_at)}
                </td>
                <td style={{ padding: '10px 12px 10px 0' }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                    fontSize: 11, fontWeight: 500,
                    background: cfg.bg, color: cfg.color,
                  }}>
                    {cfg.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EventMusiciansClient({ eventId, eventLabel, eventFood, slots, musicians, templates, cascadeTemplates = [] }: Props) {
  const [addInstrument, setAddInstrument] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')
  const [, startTransition] = useTransition()

  const totalFee = slots.reduce((sum, s) => sum + s.fee + s.additional_costs, 0)
  const missingSlots = slots.filter(s => !s.musician_id)

  // Count history entries for badge
  const historyCount = slots.reduce((n, slot) => {
    return n + (slot.invites ?? []).filter(i =>
      (i.availability === 'no' || i.availability === 'deadline_expired') &&
      (i.musician_id !== slot.musician_id || slot.availability === 'no')
    ).length
  }, 0)

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

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px', fontSize: 13, fontWeight: active ? 600 : 400,
    background: active ? 'var(--bg)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-secondary)',
    border: active ? '0.5px solid var(--border)' : '0.5px solid transparent',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
  })

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

      {/* Tab bar + controls row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', padding: 3, borderRadius: 'var(--radius-sm)' }}>
          <button style={tabBtnStyle(activeTab === 'active')} onClick={() => setActiveTab('active')}>
            Active ({slots.length})
          </button>
          <button style={tabBtnStyle(activeTab === 'history')} onClick={() => setActiveTab('history')}>
            Declined / non-responsive{historyCount > 0 ? ` (${historyCount})` : ''}
          </button>
        </div>

        {/* Controls: apply template + add slot (only shown on active tab) */}
        {activeTab === 'active' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
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
              <select
                style={{ ...inputStyle, width: 160 }}
                value={addInstrument}
                onChange={e => setAddInstrument(e.target.value)}
              >
                <option value="">Add instrument slot…</option>
                {INSTRUMENTS.map(inst => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!addInstrument}
                style={{
                  padding: '0 14px', height: 32, fontSize: 13,
                  background: 'var(--bg-secondary)', color: 'var(--text)',
                  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', fontFamily: 'var(--font)',
                  opacity: !addInstrument ? 0.5 : 1,
                }}
              >Add slot</button>
            </form>
          </div>
        )}
      </div>

      {/* History tab */}
      {activeTab === 'history' && (
        <HistoryTab slots={slots} musicians={musicians} />
      )}

      {/* Active tab — Slot table */}
      {activeTab === 'active' && (slots.length === 0 ? (
        <div style={{
          padding: '40px 24px', textAlign: 'center',
          color: 'var(--text-tertiary)', fontSize: 13,
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
        }}>
          No musician slots yet.{templates.length > 0 ? ' Apply a template or add slots individually above.' : ' Add slots individually above.'}
        </div>
      ) : (
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                {['Musician', 'Instrument', 'Date added', 'Invite', 'Reminder', 'Response', 'Deadline', 'Cascade', 'Mode', 'Email', 'Fee', 'Additional costs', 'Total fee', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '8px 12px 8px 0', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', paddingLeft: i === 0 ? 16 : 0 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map(slot => (
                <SlotRow key={slot.id} slot={slot} musicians={musicians} eventId={eventId} eventFood={eventFood} cascadeTemplates={cascadeTemplates} />
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <td colSpan={11} style={{ padding: '8px 12px 8px 16px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Totals</td>
                <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>£{totalFee.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ))}

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
