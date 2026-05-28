'use client'

import React, { useState } from 'react'
import AdminNav from './AdminNav'

const COLLAPSED = 52
const EXPANDED = 220

export default function AdminSidebar() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? EXPANDED : COLLAPSED,
        transition: 'width 0.18s ease',
        flexShrink: 0,
        background: 'var(--bg)',
        borderRight: '0.5px solid var(--border)',
        position: 'fixed',
        top: 52,
        left: 0,
        bottom: 0,
        zIndex: 30,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Nav */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '6px 0',
        scrollbarWidth: 'none',
      }}>
        <AdminNav expanded={expanded} />
      </div>
    </div>
  )
}
