'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { promoteToTriage, undoPromoteToTriage, promoteToIssues, undoPromoteToIssues } from '../actions'
import { useUndo } from '../../UndoContext'

type InboxItem = {
  id: string
  from_address: string | null
  subject: string | null
  body: string | null
  agent_decision: string | null
  created_at: string
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function EmailBody({ html }: { html: string }) {
  const isHtml = /<[a-z][\s\S]*>/i.test(html)
  if (!isHtml) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
        {html}
      </div>
    )
  }
  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { margin: 0; padding: 0; font-family: -apple-system, sans-serif; font-size: 13px; color: #c8c9cc; background: transparent; }
    a { color: #7aa9ff; }
    img { max-width: 100%; height: auto; }
  </style></head><body>${html}</body></html>`
  return (
    <iframe
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      style={{ width: '100%', border: 'none', minHeight: 400, display: 'block' }}
      onLoad={e => {
        const iframe = e.currentTarget
        const body = iframe.contentDocument?.body
        if (body) iframe.style.height = body.scrollHeight + 'px'
      }}
    />
  )
}

export default function NotAnIssueClient({ items }: { items: InboxItem[] }) {
  const router = useRouter()
  const { register } = useUndo()
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null)
  const [promoting, setPromoting] = useState<string | null>(null) // id being promoted

  const selected = items.find(i => i.id === selectedId) ?? null

  async function handlePromote(id: string, destination: 'triage' | 'issues') {
    setPromoting(id)
    if (destination === 'triage') {
      const { issueId } = await promoteToTriage(id) as { issueId: string | null }
      if (issueId) {
        register({ label: 'move to triage', perform: async () => { await undoPromoteToTriage(issueId, id); router.refresh() } })
      }
    } else {
      const { issueId } = await promoteToIssues(id) as { issueId: string | null }
      if (issueId) {
        register({ label: 'move to issues', perform: async () => { await undoPromoteToIssues(issueId, id); router.refresh() } })
      }
    }
    const idx = items.findIndex(i => i.id === id)
    const next = items[idx + 1] ?? items[idx - 1] ?? null
    setSelectedId(next?.id ?? null)
    setPromoting(null)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', fontFamily: 'var(--font)', overflow: 'hidden' }}>

      {/* Left panel */}
      <div style={{ width: 400, flexShrink: 0, borderRight: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 46, padding: '0 16px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', flex: 1 }}>Not an issue</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{items.length}</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>Nothing here</div>
          ) : items.map(item => {
            const isActive = item.id === selectedId
            return (
              <button key={item.id} onClick={() => setSelectedId(item.id)} style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 16px', border: 'none', borderBottom: '0.5px solid var(--border)',
                background: isActive ? 'var(--bg-secondary)' : 'transparent',
                cursor: 'pointer', fontFamily: 'var(--font)',
                borderLeft: isActive ? '2px solid var(--text-tertiary)' : '2px solid transparent',
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {item.subject ?? '(no subject)'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(item.created_at)}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.from_address ?? ''}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selected ? (
          <>
            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 46, borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.subject ?? '(no subject)'}
              </span>
              <button
                onClick={() => handlePromote(selected.id, 'triage')}
                disabled={promoting === selected.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 12px', borderRadius: 6, fontSize: 12,
                  border: '0.5px solid #34d399', background: 'transparent',
                  color: '#34d399', cursor: promoting === selected.id ? 'default' : 'pointer',
                  fontFamily: 'var(--font)', opacity: promoting === selected.id ? 0.5 : 1,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10V2M2 6l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Move to triage
              </button>
              <button
                onClick={() => handlePromote(selected.id, 'issues')}
                disabled={promoting === selected.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 12px', borderRadius: 6, fontSize: 12,
                  border: '0.5px solid #60a5fa', background: 'transparent',
                  color: '#60a5fa', cursor: promoting === selected.id ? 'default' : 'pointer',
                  fontFamily: 'var(--font)', opacity: promoting === selected.id ? 0.5 : 1,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M6 4v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Move to issues
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>From</div>
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 20 }}>{selected.from_address}</div>

              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Subject</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 24 }}>{selected.subject ?? '(no subject)'}</div>

              {selected.body ? <EmailBody html={selected.body} /> : null}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 13, color: 'var(--text-tertiary)' }}>
            Select an item to review
          </div>
        )}
      </div>
    </div>
  )
}
