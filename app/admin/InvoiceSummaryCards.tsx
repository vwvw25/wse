'use client'

function fmt(n: number) {
  return `£${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export default function InvoiceSummaryCards({
  totalOutstanding, unpaidCount,
  totalUninvoiced, uninvoicedCount,
  totalOutstandingScoped, scopedOwingCount,
  activeFilter = null,
  onSelectUnpaid,
  onSelectUninvoiced,
}: {
  totalOutstanding: number
  unpaidCount: number
  totalUninvoiced: number
  uninvoicedCount: number
  totalOutstandingScoped: number
  scopedOwingCount: number
  activeFilter?: 'unpaid' | 'uninvoiced' | null
  onSelectUnpaid?: () => void
  onSelectUninvoiced?: () => void
}) {
  const unpaidActive = activeFilter === 'unpaid'
  const uninvoicedActive = activeFilter === 'uninvoiced'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>

      {/* Card 1: Unpaid invoices */}
      <div
        onClick={onSelectUnpaid}
        style={{
          padding: '20px 20px 16px', borderRadius: 'var(--radius-lg)', cursor: onSelectUnpaid ? 'pointer' : 'default',
          border: `0.5px solid ${unpaidActive ? 'var(--text)' : 'var(--border)'}`,
          background: unpaidActive ? 'var(--text)' : 'var(--bg)',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10, color: unpaidActive ? 'rgba(255,255,255,0.55)' : 'var(--text-secondary)' }}>
          Unpaid invoices
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: unpaidActive ? '#fff' : 'var(--text)', lineHeight: 1 }}>
          {fmt(totalOutstanding)}
        </div>
        <div style={{ fontSize: 12, marginTop: 8, color: unpaidActive ? 'rgba(255,255,255,0.45)' : 'var(--text-tertiary)' }}>
          {unpaidCount} invoice{unpaidCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Card 2: Uninvoiced */}
      {(() => {
        const hasAny = uninvoicedCount > 0
        const bg = uninvoicedActive ? '#ff3b5c' : hasAny ? '#ff5470' : 'var(--bg)'
        const labelCol = uninvoicedActive || hasAny ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)'
        const amountCol = uninvoicedActive || hasAny ? '#fff' : 'var(--text)'
        const subCol = uninvoicedActive || hasAny ? 'rgba(255,255,255,0.55)' : 'var(--text-tertiary)'
        const borderCol = uninvoicedActive ? '#cc1f40' : hasAny ? '#ff3b5c' : 'var(--border)'
        return (
          <div
            onClick={onSelectUninvoiced}
            style={{ padding: '20px 20px 16px', borderRadius: 'var(--radius-lg)', cursor: onSelectUninvoiced ? 'pointer' : 'default', border: `0.5px solid ${borderCol}`, background: bg, transition: 'all 0.15s' }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10, color: labelCol }}>Uninvoiced</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: amountCol }}>{fmt(totalUninvoiced)}</div>
            <div style={{ fontSize: 12, marginTop: 8, color: subCol }}>{uninvoicedCount} past gig{uninvoicedCount !== 1 ? 's' : ''} not yet invoiced</div>
          </div>
        )
      })()}

      {/* Card 3: Total outstanding (unpaid + uninvoiced, scoped to past confirmed gigs) */}
      <div style={{
        padding: '20px 20px 16px', borderRadius: 'var(--radius-lg)',
        border: '0.5px solid var(--border)', background: 'var(--bg-secondary)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--text-secondary)' }}>
          Total outstanding
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
          {fmt(totalOutstandingScoped)}
        </div>
        <div style={{ fontSize: 12, marginTop: 8, color: 'var(--text-tertiary)' }}>
          {scopedOwingCount} past confirmed gig{scopedOwingCount !== 1 ? 's' : ''} not fully paid
        </div>
      </div>

    </div>
  )
}
