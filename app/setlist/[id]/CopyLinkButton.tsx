'use client'

import { useState } from 'react'

export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <button
        onClick={() => window.print()}
        style={{
          padding: '8px 20px', fontSize: 13, fontWeight: 500,
          background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
        }}
      >
        Print / Save as PDF
      </button>
      <button
        onClick={handleCopy}
        style={{
          padding: '8px 20px', fontSize: 13, fontWeight: 500,
          background: copied ? '#276749' : 'transparent', color: copied ? '#fff' : '#555',
          border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer',
        }}
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  )
}
