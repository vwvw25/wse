'use client'
import React, { useState, useTransition } from 'react'

interface Notification {
  id: string
  created_at: string
  read_at: string | null
  type: string
  message: string
  link: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function NotificationsClient({ notifications }: { notifications: Notification[] }) {
  const [items, setItems] = useState(notifications)
  const [, startTransition] = useTransition()

  function markRead(id: string) {
    startTransition(async () => {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    })
  }

  function markAllRead() {
    const unread = items.filter(n => !n.read_at).map(n => n.id)
    if (!unread.length) return
    startTransition(async () => {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unread }),
      })
      const now = new Date().toISOString()
      setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? now })))
    })
  }

  const unreadCount = items.filter(n => !n.read_at).length

  return (
    <div style={{ padding: '24px 32px', maxWidth: 800 }}>
      {unreadCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={markAllRead}
            style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', textDecoration: 'underline' }}
          >
            Mark all as read
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          No notifications yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {items.map(n => (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 0', borderBottom: '0.5px solid var(--border)',
              opacity: n.read_at ? 0.55 : 1,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                background: n.read_at ? 'transparent' : 'var(--accent)',
                border: n.read_at ? '1.5px solid var(--border)' : 'none',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{n.message}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{formatDate(n.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {n.link && (
                  <a href={n.link} style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>View &rarr;</a>
                )}
                {!n.read_at && (
                  <button
                    onClick={() => markRead(n.id)}
                    style={{ fontSize: 12, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
