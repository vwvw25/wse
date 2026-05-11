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
  html: string | null
  // Joined from musician_invites via FK
  invite_response: { availability: string }[] | null
  reminder_response: { availability: string }[] | null
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#f3f4f6', color: '#6b7280' },
  sent:      { bg: '#eff6ff', color: '#1d4ed8' },
  delivered: { bg: '#f0fdf4', color: '#16a34a' },
  failed:    { bg: '#fef2f2', color: '#dc2626' },
  bounced:   { bg: '#fef2f2', color: '#dc2626' },
  complained:{ bg: '#fff7ed', color: '#ea580c' },
}

const RESPONSE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  yes: { bg: '#f0fdf4', color: '#16a34a', label: 'Accepted' },
  no:  { bg: '#fef2f2', color: '#dc2626', label: 'Declined' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getResponse(log: EmailLog): string | null {
  if (log.type === 'availability') {
    return log.invite_response?.[0]?.availability ?? null
  }
  if (log.type === 'availability_reminder') {
    return log.reminder_response?.[0]?.availability ?? null
  }
  return null
}

export default function EmailLogsClient({ logs }: { logs: EmailLog[] }) {
  const [preview, setPreview] = useState<EmailLog | null>(null)

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {logs.length} emails
        </span>
      </div>

      {logs.length === 0 ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          No emails logged yet.
        </div>
      ) : (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Recipient', 'Type', 'Subject', 'Sent', 'Updated', 'Status', 'Response'].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '6px 12px 6px 0', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const statusStyle = STATUS_COLORS[log.status] ?? STATUS_COLORS.pending
                const response = getResponse(log)
                const responseStyle = response ? RESPONSE_COLORS[response] : null
                return (
                  <tr
                    key={log.id}
                    style={{ borderBottom: '0.5px solid var(--border)', cursor: log.html ? 'pointer' : 'default' }}
                    onClick={() => log.html && setPreview(log)}
                  >
                    <td style={{ padding: '8px 12px 8px 0', fontSize: 13, color: 'var(--text)' }}>
                      <div style={{ fontWeight: 500 }}>{log.recipient_name ?? log.recipient_email}</div>
                      {log.recipient_name && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{log.recipient_email}</div>}
                    </td>
                    <td style={{ padding: '8px 12px 8px 0', fontSize: 12, color: 'var(--text-secondary)' }}>{log.type.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '8px 12px 8px 0', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 260 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.subject}</div>
                      {log.error_message && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>{log.error_message}</div>}
                    </td>
                    <td style={{ padding: '8px 12px 8px 0', fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{formatDate(log.created_at)}</td>
                    <td style={{ padding: '8px 12px 8px 0', fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{formatDate(log.updated_at)}</td>
                    <td style={{ padding: '8px 12px 8px 0' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 500, background: statusStyle.bg, color: statusStyle.color }}>
                        {log.status}{log.alerted_at ? ' ⚠' : ''}
                      </span>
                    </td>
                    <td style={{ padding: '8px 0' }}>
                      {responseStyle ? (
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 500, background: responseStyle.bg, color: responseStyle.color }}>
                          {responseStyle.label}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Email preview modal */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
              border: '0.5px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              width: '100%', maxWidth: 680, maxHeight: '90vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 20px', borderBottom: '0.5px solid var(--border)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{preview.subject}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  To: {preview.recipient_name ? `${preview.recipient_name} <${preview.recipient_email}>` : preview.recipient_email}
                  <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
                  {formatDate(preview.created_at)}
                  <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
                  {preview.type.replace(/_/g, ' ')}
                </div>
              </div>
              <button
                onClick={() => setPreview(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1, padding: 0, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
            {/* Email body in iframe for isolation */}
            <iframe
              srcDoc={preview.html ?? ''}
              style={{ flex: 1, border: 'none', minHeight: 480 }}
              title="Email preview"
            />
          </div>
        </div>
      )}
    </div>
  )
}
