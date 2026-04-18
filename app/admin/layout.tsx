import React from 'react'
import AdminNav from './AdminNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font)', background: 'var(--bg-secondary)' }}>
      {/* Sidebar */}
      <div style={{
        width: 168,
        flexShrink: 0,
        background: 'var(--bg)',
        borderRight: '0.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 12px',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 12px', marginBottom: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>WSE</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Admin</div>
        </div>

        {/* Nav (client component for active state) */}
        <AdminNav />

        {/* Log out */}
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <a
            href="/api/admin/logout"
            style={{
              display: 'block',
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontSize: 14,
              color: 'var(--text-secondary)',
            }}
          >
            Log out
          </a>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        marginLeft: 168,
        flex: 1,
        background: 'var(--bg)',
        minHeight: '100vh',
      }}>
        {children}
      </div>
    </div>
  )
}
