'use client'
import React, { useState } from 'react'

interface EmailLog {
  id: string
  created_at: string
  updated_at: string
  type: string
  recipient_email: string
  recipient_name: string | null
  subject: string
  status: string
  error_message: string | null
  resend_id: string | null
  alerted_at: string | null
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#f3f4f6', color: '#6b7280' },
  sent:      { bg: '#eff6ff', color: '#1d4ed8' },
  delivered: { bg: '#f0fdf4', color: '#16a34a' },
  failed:    { bg: '#fef2f2', color: '#dc2626' },
  bounced:   { bg: '#fef2f2', color: '#dc2626' },
  complained:{ bg: '#fff7ed', color: '#ea580c' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EmailLogsClient({ logs }: { logs: EmailLog[] }) {
  const [showAll, setShowAll] = useState(false)

  const filtered = showAll ? logs : logs.filter(l => l.status !== 'delivered')

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} style={{ width: 14, height: 14 }} />
          Show all (including delivered)
        </label>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {filtered.length} {showAll ? 'total' : 'needing attention'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          {showAll ? 'No emails logged yet.' : 'All emails delivered — nothing needs attention.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Recipient', 'Type', 'Subject', 'Sent', 'Updated', 'Status'].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '6px 12px 6px 0', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const statusStyle = STATUS_COLORS[log.status] ?? STATUS_COLORS.pending
                return (
                  <tr key={log.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px 8px 0', fontSize: 13, color: 'var(--text)' }}>
                      <div style={{ fontWeight: 500 }}>{log.recipient_name ?? log.recipient_email}</div>
                      {log.recipient_name && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{log.recipient_email}</div>}
                    </td>
                    <td style={{ padding: '8px 12px 8px 0', fontSize: 12, color: 'var(--text-secondary)' }}>{log.type.replace('_', ' ')}</td>
                    <td style={{ padding: '8px 12px 8px 0', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 260 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.subject}</div>
                      {log.error_message && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>{log.error_message}</div>}
                    </td>
                    <td style={{ padding: '8px 12px 8px 0', fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{formatDate(log.created_at)}</td>
                    <td style={{ padding: '8px 12px 8px 0', fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{formatDate(log.updated_at)}</td>
                    <td style={{ padding: '8px 0' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 500, background: statusStyle.bg, color: statusStyle.color }}>
                        {log.status}
                        {log.alerted_at ? ' ⚠' : ''}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
