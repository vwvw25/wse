'use client'

import { STATUS_MAP } from '@/lib/event-statuses'
import type { EventStatus } from '@/lib/event-statuses'
import type { DuplicateEventMatch } from './actions'

export default function DuplicateWarningModal({
  matches,
  onCancel,
  onConfirm,
}: {
  matches: DuplicateEventMatch[]
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 460, maxHeight: '80vh', overflowY: 'auto',
          background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
          padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
          Possible duplicate event
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.5 }}>
          {matches.length === 1 ? 'This looks similar to an existing event' : `This looks similar to ${matches.length} existing events`} on the same date. Check it's not already logged before creating a new one.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {matches.map(m => {
            const status = STATUS_MAP[m.status as EventStatus]
            return (
              <a
                key={m.id}
                href={`/admin/events/${m.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', padding: '10px 12px',
                  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none', color: 'var(--text)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {m.venue_name || m.event_type || 'Untitled event'}
                  </span>
                  {status && (
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6,
                      background: status.bg, color: status.color, whiteSpace: 'nowrap',
                    }}>
                      {status.label}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                  {[m.event_date, m.agency_name || m.agent_name, m.client_email].filter(Boolean).join(' · ')}
                </div>
              </a>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
              background: 'transparent', border: '0.5px solid var(--border-hover)',
              color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', fontFamily: 'var(--font)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
              background: 'var(--text)', border: 'none',
              color: 'var(--bg)', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', fontFamily: 'var(--font)',
            }}
          >
            Create anyway
          </button>
        </div>
      </div>
    </div>
  )
}
