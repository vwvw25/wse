'use client'

export default function ContractStatusModal({
  onSelect,
}: {
  onSelect: (status: 'contract_received' | 'contracted') => void
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 380, background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
          padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
          Contract parsed
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.5 }}>
          What's the status of this booking now?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => onSelect('contract_received')}
            style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 500, textAlign: 'left',
              background: 'var(--pill-contract-received-bg)', color: 'var(--pill-contract-received-text)',
              border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
            }}
          >
            Contract received
            <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>
              Sent to us, not yet fully signed off
            </div>
          </button>
          <button
            onClick={() => onSelect('contracted')}
            style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 500, textAlign: 'left',
              background: 'var(--pill-contracted-bg)', color: 'var(--pill-contracted-text)',
              border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
            }}
          >
            Contracted
            <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>
              Fully signed and confirmed
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
