'use client'

import React, { useState, useEffect } from 'react'

export default function NotificationBell() {
  const [count, setCount] = useState(0)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    fetch('/api/admin/notifications?unread=true')
      .then(r => r.json())
      .then((data: unknown[]) => setCount(data.length))
      .catch(() => {})
  }, [])

  return (
    <a
      href="/admin/notifications"
      aria-label="Notifications"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 'var(--radius-sm)',
        color: hovered ? 'var(--text)' : 'var(--text-secondary)',
        background: hovered ? 'var(--bg-secondary)' : 'transparent',
        textDecoration: 'none',
        transition: 'color 0.12s, background 0.12s',
      }}
    >
      {/* Bell icon */}
      <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5A4.5 4.5 0 003.5 6v3L2 10.5h12L12.5 9V6A4.5 4.5 0 008 1.5z"
          stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"/>
        <path d="M6.5 13.5a1.5 1.5 0 003 0"
          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>

      {/* Badge */}
      {count > 0 && (
        <span style={{
          position: 'absolute',
          top: 3,
          right: 3,
          minWidth: 15,
          height: 15,
          borderRadius: 8,
          background: '#dc2626',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          fontFamily: 'var(--font)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 3px',
          border: '1.5px solid var(--bg)',
          lineHeight: 1,
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </a>
  )
}
