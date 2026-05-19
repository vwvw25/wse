import React from 'react'
import AdminNav, { AdminMobileNav } from './AdminNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .admin-sidebar {
          width: 168px;
          flex-shrink: 0;
          background: var(--bg);
          border-right: 0.5px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 24px 12px;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 10;
        }
        .admin-main {
          margin-left: 168px;
          flex: 1;
          background: var(--bg);
          min-height: 100vh;
        }
        .admin-mobile-nav { display: none; }

        /* Responsive page padding — use className="admin-page" on page root divs */
        .admin-page { padding: 32px; }

        /* Page header with title + actions */
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
        .page-header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

        /* Tabs row */
        .admin-tabs { display: flex; border-bottom: 0.5px solid var(--border); margin-bottom: 28px; gap: 0; }

        /* Tables scroll horizontally rather than breaking layout */
        .admin-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }

        @media (max-width: 768px) {
          .admin-sidebar { display: none; }
          .admin-mobile-nav { display: block; }
          .admin-main { margin-left: 0; padding-top: 52px; }
          .admin-page { padding: 16px; }
          .page-header { flex-direction: column; gap: 12px; }
          .page-header-actions { width: 100%; }
          .admin-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: nowrap; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font)', background: 'var(--bg-secondary)' }}>
        {/* Desktop sidebar */}
        <div className="admin-sidebar">
          <div style={{ padding: '0 12px', marginBottom: 28 }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>WSE</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Admin</div>
          </div>
          <AdminNav />
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

        {/* Mobile top bar + drawer */}
        <div className="admin-mobile-nav">
          <AdminMobileNav />
        </div>

        {/* Main content */}
        <div className="admin-main">
          {children}
        </div>
      </div>
    </>
  )
}
