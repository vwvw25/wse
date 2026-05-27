'use client'

import { useState } from 'react'

function resolveTokens(
  template: string,
  tokens: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => tokens[key] ?? '')
}

function bodyToPreviewHtml(body: string): string {
  return body
    .split(/\n\n+/)
    .map(para => `<p style="margin:0 0 12px;line-height:1.6">${para.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 34, padding: '0 10px', fontSize: 13,
  background: 'var(--bg)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  display: 'block', marginBottom: 4,
}

export default function InvoiceEmailModal({
  invoiceId,
  invoiceNumber,
  clientEmail,
  adminEmail,
  subjectTemplate,
  bodyTemplate,
  tokens,
  onClose,
  onSent,
}: {
  invoiceId: string
  invoiceNumber: string
  clientEmail: string | null
  adminEmail: string | null
  subjectTemplate: string
  bodyTemplate: string
  tokens: Record<string, string>
  onClose: () => void
  onSent: () => void
}) {
  const resolvedSubject = resolveTokens(subjectTemplate, tokens)
  const resolvedBody = resolveTokens(bodyTemplate, tokens)

  const [to, setTo] = useState(clientEmail ?? '')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState(resolvedSubject)
  const [body, setBody] = useState(resolvedBody)
  const [copyToMe, setCopyToMe] = useState(true)
  const [preview, setPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    if (!to.trim()) { setError('Recipient email is required'); return }
    setSending(true)
    setError(null)

    const ccList: string[] = []
    if (cc.trim()) ccList.push(cc.trim())
    if (copyToMe && adminEmail && !ccList.includes(adminEmail)) ccList.push(adminEmail)

    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), cc: ccList, subject, body }),
      })
      if (res.ok) {
        onSent()
        onClose()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to send')
      }
    } catch {
      setError('Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
          border: '0.5px solid var(--border)',
          width: '100%', maxWidth: 560,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 0', borderBottom: '0.5px solid var(--border)', paddingBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Send Invoice</h2>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Recipient</label>
            <input style={inputStyle} type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="client@example.com" />
          </div>
          <div>
            <label style={labelStyle}>Cc</label>
            <input style={inputStyle} type="email" value={cc} onChange={e => setCc(e.target.value)} placeholder="Email to:" />
          </div>
          <div>
            <label style={labelStyle}>Subject</label>
            <input style={inputStyle} value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Message</label>
            {preview ? (
              <div
                style={{
                  minHeight: 160, padding: '8px 10px', fontSize: 13,
                  background: 'var(--bg-secondary)', color: 'var(--text)',
                  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  lineHeight: 1.6,
                }}
                dangerouslySetInnerHTML={{ __html: bodyToPreviewHtml(body) }}
              />
            ) : (
              <textarea
                style={{
                  ...inputStyle, height: 'auto', minHeight: 160,
                  padding: '8px 10px', resize: 'vertical', lineHeight: 1.6,
                }}
                value={body}
                onChange={e => setBody(e.target.value)}
              />
            )}
          </div>

          {/* Attachment */}
          <div>
            <label style={labelStyle}>Attachment</label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              fontSize: 13, color: 'var(--accent)',
            }}>
              <span style={{ fontSize: 14 }}>📎</span>
              <span>{invoiceNumber}.pdf</span>
            </div>
          </div>

          {error && (
            <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
              <input
                type="checkbox"
                checked={copyToMe}
                onChange={e => setCopyToMe(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: 'var(--accent)' }}
              />
              Copy to Myself
            </label>
            <button
              onClick={() => setPreview(p => !p)}
              style={{
                background: 'none', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '5px 12px',
                fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)',
                color: 'var(--text-secondary)',
              }}
            >
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '7px 16px', fontSize: 13,
                background: 'none', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                color: 'var(--text-secondary)', fontFamily: 'var(--font)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !to.trim()}
              style={{
                padding: '7px 16px', fontSize: 13, fontWeight: 500,
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)',
                cursor: sending || !to.trim() ? 'not-allowed' : 'pointer',
                opacity: sending || !to.trim() ? 0.6 : 1,
              }}
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
