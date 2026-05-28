'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function Ico({ children }: { children: React.ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ display: 'block', flexShrink: 0 }}>
      {children}
    </svg>
  )
}

const HomeIcon = () => <Ico>
  <path d="M2 7L8 2l6 5v5.5a.5.5 0 01-.5.5H10v-3.5H6V13H2.5a.5.5 0 01-.5-.5V7z"
    stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"/>
</Ico>

const CalendarIcon = () => <Ico>
  <rect x="2" y="4" width="12" height="10" rx=".5" stroke="currentColor" strokeWidth="1.3"/>
  <path d="M2 8h12M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
</Ico>

const PeopleIcon = () => <Ico>
  <circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
  <path d="M1 14c0-2.76 2.01-4.5 4.5-4.5S10 11.24 10 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  <circle cx="11.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
  <path d="M12.5 9.5c1.5.5 2.5 1.8 2.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
</Ico>

const UserIcon = () => <Ico>
  <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.3"/>
  <path d="M2 14.5c0-3.04 2.69-5 6-5s6 1.96 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
</Ico>

const ReceiptIcon = () => <Ico>
  <path d="M3 2h10v12l-2-1.5L9.5 14 8 12.5 6.5 14 5 12.5 3 14V2z"
    stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"/>
  <path d="M5.5 6h5M5.5 9h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
</Ico>

const QuoteIcon = () => <Ico>
  <path d="M1.5 3.5h13a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H9l-3 3-1-3H2a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5z"
    stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  <path d="M4.5 7h7M4.5 9.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
</Ico>

const ListMusicIcon = () => <Ico>
  <path d="M2 4h8M2 7.5h8M2 11h5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  <circle cx="12.5" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
  <path d="M14 12V7.5l-3 .8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
</Ico>

const TemplateIcon = () => <Ico>
  <rect x="2" y="2" width="12" height="12" rx=".5" stroke="currentColor" strokeWidth="1.3"/>
  <path d="M2 7h12M7 7v7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
</Ico>

const BriefcaseIcon = () => <Ico>
  <rect x="1.5" y="6" width="13" height="8.5" rx=".5" stroke="currentColor" strokeWidth="1.3"/>
  <path d="M5.5 6V4.5A.5.5 0 016 4h4a.5.5 0 01.5.5V6M1.5 10h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
</Ico>

const InvoiceIcon = () => <Ico>
  <rect x="1.5" y="4" width="13" height="9" rx=".5" stroke="currentColor" strokeWidth="1.3"/>
  <path d="M1.5 7.5h13M4 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
</Ico>

const MailIcon = () => <Ico>
  <rect x="1.5" y="4" width="13" height="9" rx=".5" stroke="currentColor" strokeWidth="1.3"/>
  <path d="M1.5 5l6.5 4.5L14.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
</Ico>

const FlaskIcon = () => <Ico>
  <path d="M6 2v5.5L2.5 13a.5.5 0 00.5.7h10a.5.5 0 00.5-.7L10 7.5V2"
    stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"/>
  <path d="M5.5 2h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
</Ico>

const BellIcon = () => <Ico>
  <path d="M8 1.5A4.5 4.5 0 003.5 6v3L2 10.5h12L12.5 9V6A4.5 4.5 0 008 1.5z"
    stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  <path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
</Ico>

// ── Nav links config ──────────────────────────────────────────────────────────

const navLinks = [
  { href: '/admin',                   label: 'Dashboard',         icon: <HomeIcon /> },
  { href: '/admin/events',            label: 'Events',            icon: <CalendarIcon /> },
  { href: '/admin/band-builder',      label: 'Band builder',      icon: <PeopleIcon /> },
  { href: '/admin/musicians',         label: 'Musicians',         icon: <UserIcon /> },
  { href: '/admin/musician-invoices', label: 'Musician invoices', icon: <ReceiptIcon /> },
  { href: '/admin/quotes',            label: 'Quotes',            icon: <QuoteIcon /> },
  { href: '/admin/set-lists',         label: 'Set lists',         icon: <ListMusicIcon /> },
  { href: '/admin/templates',         label: 'Templates',         icon: <TemplateIcon /> },
  { href: '/admin/clients',           label: 'Clients',           icon: <BriefcaseIcon /> },
  { href: '/admin/invoices',          label: 'Invoices',          icon: <InvoiceIcon /> },
  { href: '/admin/email-logs',        label: 'Email logs',        icon: <MailIcon /> },
  { href: '/admin/parse-evals',       label: 'Parse evals',       icon: <FlaskIcon /> },
  { href: '/admin/notifications',     label: 'Notifications',     icon: <BellIcon /> },
  // Settings lives in the user menu (top right)
]

// ── NavLinks ──────────────────────────────────────────────────────────────────

function NavLinks({
  onNavigate,
  unreadCount,
  expanded = true,
}: {
  onNavigate?: () => void
  unreadCount: number
  expanded?: boolean
}) {
  const pathname = usePathname()

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 6px' }}>
      {navLinks.map(link => {
        const isActive = link.href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(link.href)
        const isNotifications = link.label === 'Notifications'
        const hasBadge = isNotifications && unreadCount > 0

        return (
          <a
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            title={!expanded ? link.label : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: expanded ? 9 : 0,
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontSize: 13.5,
              background: isActive ? 'var(--bg-secondary)' : 'transparent',
              color: isActive ? 'var(--text)' : 'var(--text-secondary)',
              fontWeight: isActive ? 500 : 400,
              transition: 'background 0.12s, color 0.12s',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--bg-secondary)'
                e.currentTarget.style.color = 'var(--text)'
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }
            }}
          >
            {/* Icon with optional dot badge when collapsed */}
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', position: 'relative' }}>
              {link.icon}
              {hasBadge && !expanded && (
                <span style={{
                  position: 'absolute', top: -2, right: -3,
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#dc2626',
                  border: '1.5px solid var(--bg)',
                }} />
              )}
            </span>

            {/* Label — always rendered but fades in/out */}
            <span style={{
              opacity: expanded ? 1 : 0,
              transition: 'opacity 0.1s ease',
              display: 'flex', alignItems: 'center', flex: 1, gap: 4,
              overflow: 'hidden',
            }}>
              {link.label}
              {hasBadge && expanded && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 18, height: 18, borderRadius: 9,
                  background: '#dc2626', color: '#fff',
                  fontSize: 11, fontWeight: 600, padding: '0 5px',
                  marginLeft: 'auto',
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
          </a>
        )
      })}
    </nav>
  )
}

// ── Desktop nav (used by AdminSidebar) ────────────────────────────────────────

export default function AdminNav({ expanded }: { expanded: boolean }) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/admin/notifications?unread=true')
      .then(r => r.json())
      .then((data: unknown[]) => setUnreadCount(data.length))
      .catch(() => {})
  }, [])

  return <NavLinks unreadCount={unreadCount} expanded={expanded} />
}

// ── Mobile drawer nav ─────────────────────────────────────────────────────────

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
            padding: 8, color: 'var(--text)',
            display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center',
          }}
        >
          <span style={{ display: 'block', width: 22, height: 1.5, background: 'currentColor', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 22, height: 1.5, background: 'currentColor', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 22, height: 1.5, background: 'currentColor', borderRadius: 2 }} />
        </button>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.3)',
        }} />
      )}

      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 300,
        width: 232,
        background: 'var(--bg)',
        borderRight: '0.5px solid var(--border)',
        padding: '20px 0',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s ease',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '0 16px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>WSE</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Admin</div>
        </div>

        <NavLinks unreadCount={unreadCount} expanded onNavigate={() => setOpen(false)} />

        <div style={{ marginTop: 'auto', padding: '16px 12px 0' }}>
          <a
            href="/admin/settings"
            style={{ display: 'block', padding: '7px 10px', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontSize: 13.5, color: 'var(--text-secondary)' }}
          >
            Settings
          </a>
          <a
            href="/api/admin/logout"
            style={{ display: 'block', padding: '7px 10px', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontSize: 13.5, color: 'var(--text-secondary)' }}
          >
            Log out
          </a>
        </div>
      </div>
    </>
  )
}
