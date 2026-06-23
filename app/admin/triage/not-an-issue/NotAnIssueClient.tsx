'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { promoteToTriage } from '../actions'

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

export default function NotAnIssueClient({ items }: { items: InboxItem[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<InboxItem | null>(items[0] ?? null)
  const [promoting, setPromoting] = useState(false)

  async function handlePromote(id: string) {
    setPromoting(true)
    await promoteToTriage(id)
    const idx = items.findIndex(i => i.id === id)
    const next = items[idx + 1] ?? items[idx - 1] ?? null
    setSelected(next)
    setPromoting(false)
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
            const isActive = item.id === selected?.id
            return (
              <button key={item.id} onClick={() => setSelected(item)} style={{
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
                onClick={() => handlePromote(selected.id)}
                disabled={promoting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 12px', borderRadius: 6, fontSize: 12,
                  border: '0.5px solid #34d399', background: 'transparent',
                  color: '#34d399', cursor: promoting ? 'default' : 'pointer',
                  fontFamily: 'var(--font)', opacity: promoting ? 0.5 : 1,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10V2M2 6l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Move to triage
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>From</div>
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 20 }}>{selected.from_address}</div>

              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Subject</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 24 }}>{selected.subject ?? '(no subject)'}</div>

              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {selected.body ?? ''}
              </div>
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
