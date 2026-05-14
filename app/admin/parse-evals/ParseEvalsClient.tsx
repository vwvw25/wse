'use client'

import React, { useState } from 'react'
import { updateEvalNotes, toggleEdgeCase } from './actions'

type Eval = {
  id: string
  event_id: string
  parsed_auto_fill: Record<string, unknown>
  parsed_request_details: Record<string, unknown>
  saved_auto_fill: Record<string, unknown>
  saved_request_details: Record<string, unknown>
  notes: string | null
  is_edge_case: boolean
  created_at: string
  events: {
    agency_name: string | null
    agent_name: string | null
    event_date: string | null
  } | null
}

const FIELD_LABELS: Record<string, string> = {
  is_agency: 'Client type',
  agency_name: 'Agency',
  agent_name: 'Agent name',
  agent_first_name: 'Agent first name',
  agent_surname: 'Agent surname',
  client_email: 'Email',
  event_date: 'Event date',
  event_type: 'Event type',
  venue_name: 'Venue',
  venue_postcode: 'Postcode',
  venue_address: 'Address',
  location: 'Location',
  guests: 'Guests',
  arrival_time: 'Arrival',
  start_time: 'Start',
  finish_time: 'Finish',
  load_out_time: 'Load out',
  booking_types: 'Booking type',
  travel_type: 'Travel',
}

const RD_LABELS: Record<string, string> = {
  band_size_requested: 'Band size',
  sets_requested: 'Sets',
  special_requirements: 'Special req.',
  sound_requirements: 'Sound req.',
  notes: 'Notes',
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—'
  if (typeof v === 'boolean') return v ? 'Agency' : 'Direct'
  return String(v)
}

function diffFields(
  parsed: Record<string, unknown>,
  saved: Record<string, unknown>,
  labels: Record<string, string>,
) {
  return Object.keys(labels).map(key => {
    const p = formatVal(parsed[key])
    const s = formatVal(saved[key])
    const changed = p !== s
    return { key, label: labels[key], parsed: p, saved: s, changed }
  })
}

export default function ParseEvalsClient({ evals }: { evals: Eval[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (evals.length === 0) {
    return (
      <div style={{
        padding: '48px 24px', textAlign: 'center',
        color: 'var(--text-tertiary)', fontSize: 13,
        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
      }}>
        No parse evals yet — they'll appear here after emails are parsed and saved.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {evals.map(ev => {
        const autoFields = diffFields(ev.parsed_auto_fill, ev.saved_auto_fill, FIELD_LABELS)
        const rdFields = diffFields(ev.parsed_request_details, ev.saved_request_details, RD_LABELS)
        const corrections = [...autoFields, ...rdFields].filter(f => f.changed).length
        const isOpen = expanded === ev.id
        const eventLabel = ev.events?.agency_name ?? ev.events?.agent_name ?? 'Unknown'
        const dateStr = new Date(ev.created_at).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric',
        })

        return (
          <div key={ev.id} style={{
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {/* Row header */}
            <div
              onClick={() => setExpanded(isOpen ? null : ev.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', cursor: 'pointer',
                background: isOpen ? 'var(--bg-secondary)' : 'var(--bg)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{eventLabel}</span>
                  {ev.events?.event_date && (
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      · {new Date(ev.events.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {ev.is_edge_case && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '1px 6px',
                      background: '#fef3c7', color: '#92400e',
                      borderRadius: 4,
                    }}>Edge case</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{dateStr}</div>
              </div>
              <div style={{
                fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 4,
                background: corrections === 0 ? '#dcfce7' : '#fee2e2',
                color: corrections === 0 ? '#166534' : '#991b1b',
              }}>
                {corrections === 0 ? '✓ No corrections' : `${corrections} correction${corrections > 1 ? 's' : ''}`}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{isOpen ? '▲' : '▼'}</span>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{ borderTop: '0.5px solid var(--border)', padding: '20px 20px' }}>
                {/* Field diffs */}
                <div style={{ marginBottom: 20 }}>
                  <FieldTable fields={[...autoFields, ...rdFields]} />
                </div>

                {/* Notes + edge case */}
                <NotesRow evalId={ev.id} initialNotes={ev.notes} initialEdgeCase={ev.is_edge_case} />

                {/* Link to event */}
                <div style={{ marginTop: 16 }}>
                  <a
                    href={`/admin/events/${ev.event_id}`}
                    style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}
                  >
                    View event →
                  </a>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function FieldTable({ fields }: { fields: { key: string; label: string; parsed: string; saved: string; changed: boolean }[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <th style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', width: 160 }}>Field</th>
          <th style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Parsed</th>
          <th style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Saved</th>
        </tr>
      </thead>
      <tbody>
        {fields.map(f => (
          <tr
            key={f.key}
            style={{
              borderBottom: '0.5px solid var(--border)',
              background: f.changed ? '#fff7ed' : undefined,
            }}
          >
            <td style={{ padding: '7px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>{f.label}</td>
            <td style={{ padding: '7px 12px', color: f.changed ? '#dc2626' : 'var(--text-tertiary)', fontFamily: f.changed ? 'monospace' : undefined }}>
              {f.parsed}
            </td>
            <td style={{ padding: '7px 12px', color: f.changed ? '#16a34a' : 'var(--text)', fontWeight: f.changed ? 600 : undefined, fontFamily: f.changed ? 'monospace' : undefined }}>
              {f.saved}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function NotesRow({ evalId, initialNotes, initialEdgeCase }: {
  evalId: string
  initialNotes: string | null
  initialEdgeCase: boolean
}) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [isEdgeCase, setIsEdgeCase] = useState(initialEdgeCase)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSaveNotes() {
    setSaving(true)
    await updateEvalNotes(evalId, notes || null)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleToggleEdgeCase() {
    const next = !isEdgeCase
    setIsEdgeCase(next)
    await toggleEdgeCase(evalId, next)
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 5 }}>Notes</div>
        <textarea
          value={notes}
          onChange={e => { setNotes(e.target.value); setSaved(false) }}
          placeholder="Add notes about this parse…"
          style={{
            width: '100%', minHeight: 64, padding: '8px 10px',
            fontSize: 13, fontFamily: 'var(--font)', lineHeight: 1.5,
            background: 'var(--bg-secondary)', color: 'var(--text)',
            border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
            resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button
            onClick={handleSaveNotes}
            disabled={saving}
            style={{
              padding: '5px 14px', fontSize: 12, cursor: 'pointer',
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font)',
            }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save notes'}
          </button>
        </div>
      </div>
      <div style={{ paddingTop: 20 }}>
        <button
          onClick={handleToggleEdgeCase}
          style={{
            padding: '6px 14px', fontSize: 12, cursor: 'pointer',
            background: isEdgeCase ? '#fef3c7' : 'var(--bg-secondary)',
            color: isEdgeCase ? '#92400e' : 'var(--text-secondary)',
            border: `0.5px solid ${isEdgeCase ? '#f59e0b' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)',
            fontWeight: isEdgeCase ? 600 : undefined,
          }}
        >
          {isEdgeCase ? '★ Edge case' : '☆ Mark as edge case'}
        </button>
      </div>
    </div>
  )
}
