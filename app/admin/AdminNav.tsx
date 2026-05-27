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
  { href: '/admin/invoices', label: 'Invoices' },
  { href: '/admin/email-logs', label: 'Email logs' },
  { href: '/admin/parse-evals', label: 'Parse evals' },
  { href: '/admin/notifications', label: 'Notifications' },
  { href: '/admin/settings', label: 'Settings' },
]

function NavLinks({ onNavigate, unreadCount }: { onNavigate?: () => void; unreadCount: number }) {
  const pathname = usePathname()
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
            onClick={onNavigate}
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

// Desktop sidebar nav
export default function AdminNav() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/admin/notifications?unread=true')
      .then(r => r.json())
      .then((data: unknown[]) => setUnreadCount(data.length))
      .catch(() => {})
  }, [])

  return <NavLinks unreadCount={unreadCount} />
}

// Mobile top bar + drawer
export function AdminMobileNav() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/admin/notifications?unread=true')
      .then(r => r.json())
      .then((data: unknown[]) => setUnreadCount(data.length))
      .catch(() => {})
  }, [])

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 52,
        background: 'var(--bg)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>WSE</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>Admin</span>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Menu"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 8, color: 'var(--text)', display: 'flex', flexDirection: 'column',
            gap: 5, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ display: 'block', width: 22, height: 1.5, background: 'currentColor', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 22, height: 1.5, background: 'currentColor', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 22, height: 1.5, background: 'currentColor', borderRadius: 2 }} />
        </button>
      </div>

      {/* Drawer overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.3)',
          }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 300,
        width: 220,
        background: 'var(--bg)',
        borderRight: '0.5px solid var(--border)',
        padding: '20px 12px',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s ease',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '0 12px', marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>WSE</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Admin</div>
        </div>

        <NavLinks unreadCount={unreadCount} onNavigate={() => setOpen(false)} />

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <a
            href="/api/admin/logout"
            style={{
              display: 'block', padding: '7px 12px',
              borderRadius: 'var(--radius-sm)', textDecoration: 'none',
              fontSize: 14, color: 'var(--text-secondary)',
            }}
          >
            Log out
          </a>
        </div>
      </div>
    </>
  )
}
