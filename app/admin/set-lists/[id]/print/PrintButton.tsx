'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{ padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}
    >
      Print / Save as PDF
    </button>
  )
}
