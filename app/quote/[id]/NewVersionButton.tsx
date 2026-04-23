'use client'

import { useState } from 'react'

export default function NewVersionButton({ quoteId }: { quoteId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/new-version`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        window.location.href = `/quote/new/details?edit=${data.id}`
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        display: 'inline-block', padding: '6px 12px', fontSize: 12, fontWeight: 500,
        background: 'var(--bg)', color: 'var(--text)',
        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1, fontFamily: 'var(--font)',
      }}
    >
      {loading ? 'Creating…' : 'New version →'}
    </button>
  )
}
