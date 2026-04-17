'use client'

export default function PrintButton({ backHref }: { backHref: string }) {
  return (
    <div style={{ marginTop: 36, display: 'flex', gap: 16, alignItems: 'center' }}>
      <button
        onClick={() => window.print()}
        style={{
          padding: '9px 22px', fontSize: 13, fontWeight: 500,
          background: '#111', color: '#fff', border: 'none',
          borderRadius: 6, cursor: 'pointer',
        }}
      >
        Print / Save as PDF
      </button>
      <a href={backHref} style={{ fontSize: 13, color: '#555', textDecoration: 'none' }}>← Back to set list</a>
    </div>
  )
}
