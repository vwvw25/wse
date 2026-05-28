import React from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import AdminSidebar from './AdminSidebar'
import { AdminMobileNav } from './AdminNav'
import UserMenu from './UserMenu'

const SIDEBAR_WIDTH = 52 // collapsed width (px)

async function getCurrentUserEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() { /* no-op in server component */ },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user?.email ?? null
  } catch {
    return null
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const userEmail = await getCurrentUserEmail()

  return (
    <>
      <style>{`
        /* ── Main content area ──────────────────────── */
        .admin-main {
          margin-left: ${SIDEBAR_WIDTH}px;
          margin-top: 52px;
          min-height: calc(100vh - 52px);
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary);
        }

        /* ── Full-width header ──────────────────────── */
        .admin-header {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 52px;
          background: var(--bg);
          border-bottom: 0.5px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px 0 16px;
          z-index: 40;
          flex-shrink: 0;
        }

        /* ── Page content ───────────────────────────── */
        .admin-content { flex: 1; }

        /* ── Responsive page padding ────────────────── */
        .admin-page { padding: 32px; }

        /* Page header with title + actions */
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
        .page-header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

        /* Tabs */
        .admin-tabs { display: flex; border-bottom: 0.5px solid var(--border); margin-bottom: 28px; gap: 0; }

        /* Tables */
        .admin-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }

        /* ── Mobile ─────────────────────────────────── */
        .admin-mobile-nav { display: none; }
        @media (max-width: 768px) {
          .admin-sidebar-desktop { display: none; }
          .admin-mobile-nav { display: block; }
          .admin-header { display: none; }
          .admin-main { margin-left: 0; margin-top: 52px; }
          .admin-page { padding: 16px; }
          .page-header { flex-direction: column; gap: 12px; }
          .page-header-actions { width: 100%; }
          .admin-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: nowrap; }
        }
      `}</style>

      {/* Full-width header */}
      <div className="admin-header">
        <img src="/logo.png" alt="WSE" style={{ width: 26, height: 26, objectFit: 'contain' }} />
        <UserMenu email={userEmail} />
      </div>

      <div style={{ display: 'flex', fontFamily: 'var(--font)' }}>
        {/* Desktop collapsible sidebar */}
        <div className="admin-sidebar-desktop">
          <AdminSidebar />
        </div>

        {/* Mobile top bar + drawer */}
        <div className="admin-mobile-nav">
          <AdminMobileNav />
        </div>

        {/* Main content */}
        <div className="admin-main" style={{ flex: 1 }}>
          <div className="admin-content">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
