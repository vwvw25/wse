'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

const navLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/quotes', label: 'Quotes' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/add-ons', label: 'Add-ons' },
]

export default function AdminNav() {
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
            style={{
              display: 'block',
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
          </a>
        )
      })}
    </nav>
  )
}
