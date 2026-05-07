'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const navLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/band-builder', label: 'Band builder' },
  { href: '/admin/musicians', label: 'Musicians' },
  { href: '/admin/quotes', label: 'Quotes' },
  { href: '/admin/set-lists', label: 'Set lists' },
  { href: '/admin/templates', label: 'Templates' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/email-logs', label: 'Email logs' },
  { href: '/admin/notifications', label: 'Notifications' },
  { href: '/admin/settings', label: 'Settings' },
]

export default function AdminNav() {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/admin/notifications?unread=true')
      .then(r => r.json())
      .then((data: unknown[]) => setUnreadCount(data.length))
      .catch(() => {})
  }, [])

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {navLinks.map(link => {
        const isActive = link.href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(link.href)
        return (
          <a
            key={link.href}
            href={link.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontSize: 14,
              background: isActive ? 'var(--bg-secondary)' : 'transparent',
              color: isActive ? 'var(--text)' : 'var(--text-secondary)',
              fontWeight: isActive ? 500 : 400,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {link.label}
            {link.label === 'Notifications' && unreadCount > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 18, height: 18, borderRadius: 9,
                background: '#dc2626', color: '#fff',
                fontSize: 11, fontWeight: 600, marginLeft: 6, padding: '0 5px',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </a>
        )
      })}
    </nav>
  )
}
