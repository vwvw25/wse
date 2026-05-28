'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateMusicianInvoiceStatus, updateMusicianPaymentDate } from './actions'

function fmt(n: number) {
  return `£${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export type MusicianInvoiceRow = {
  id: string
  instrument: string
  fee: number
  additional_costs: number
  musician_invoice_status: string | null
  musician_invoice_path: string | null
  musician_invoice_filename: string | null
  musician_payment_date: string | null
  event: { id: string; event_date: string | null; agency_name: string | null; agent_name: string | null } | null
  musician: { id: string; first_name: string; last_name: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  received: { label: 'Received', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  queried:  { label: 'Queried',  color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  paid:     { label: 'Paid',     color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
}

const inputStyle: React.CSSProperties = {
  height: 30, padding: '0 8px', fontSize: 12, boxSizing: 'border-box',
  background: 'var(--bg-secondary)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none',
}

function StatusCell({ slotId, status }: { slotId: string; status: string | null }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [current, setCurrent] = useState(status ?? '')

  function handleChange(val: string) {
    setCurrent(val)
    startTransition(async () => {
      await updateMusicianInvoiceStatus(slotId, val || null)
      router.refresh()
    })
  }

  const cfg = STATUS_CONFIG[current]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {cfg && (
        <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}`, whiteSpace: 'nowrap' }}>
          {cfg.label}
        </span>
      )}
      <select
        value={current}
        onChange={e => handleChange(e.target.value)}
        style={{ ...inputStyle, width: cfg ? 28 : 100, paddingLeft: cfg ? 2 : 8, paddingRight: 2 }}
        title="Change status"
      >
        <option value="">—</option>
        <option value="received">Received</option>
        <option value="queried">Queried</option>
        <option value="paid">Paid</option>
      </select>
    </div>
  )
}

function PaymentDateCell({ slotId, date }: { slotId: string; date: string | null }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [current, setCurrent] = useState(date ?? '')

  function handleChange(val: string) {
    setCurrent(val)
    startTransition(async () => {
      await updateMusicianPaymentDate(slotId, val || null)
      router.refresh()
    })
  }

  return (
    <input
      type="date"
      value={current}
      onChange={e => handleChange(e.target.value)}
      style={{ ...inputStyle, width: 130, colorScheme: 'light' }}
    />
  )
}

function InvoiceCell({ slotId, path, filename }: { slotId: string; path: string | null; filename: string | null }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(file: File) {
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/admin/musician-invoices/${slotId}/upload`, { method: 'POST', body: form })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Upload failed')
    } else {
      router.refresh()
    }
    setUploading(false)
  }

  if (path) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>✓ Uploaded</span>
        <a
          href={`/api/admin/musician-invoices/${slotId}/file`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}
        >
          {filename ?? 'View'}
        </a>
        <button
          onClick={() => fileRef.current?.click()}
          title="Replace file"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-tertiary)', padding: 0, fontFamily: 'var(--font)' }}
        >
          Replace
        </button>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        style={{
          padding: '4px 10px', fontSize: 12, fontWeight: 500, cursor: uploading ? 'default' : 'pointer',
          background: 'var(--bg-secondary)', color: 'var(--text)',
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font)', opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading ? 'Uploading…' : 'Upload invoice'}
      </button>
      {error && <span style={{ fontSize: 11, color: '#dc2626' }}>{error}</span>}
    </div>
  )
}

type SortKey = 'event_date' | 'musician' | 'instrument' | 'fee' | 'status'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'received' | 'queried' | 'paid' | 'none'

export default function MusicianInvoicesClient({ rows }: { rows: MusicianInvoiceRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('event_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = rows.filter(r => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'none') return !r.musician_invoice_status
    return r.musician_invoice_status === statusFilter
  })

  const sorted = [...filtered].sort((a, b) => {
    let av = '', bv = ''
    if (sortKey === 'event_date') { av = a.event?.event_date ?? ''; bv = b.event?.event_date ?? '' }
    else if (sortKey === 'musician') { av = `${a.musician?.last_name}${a.musician?.first_name}`; bv = `${b.musician?.last_name}${b.musician?.first_name}` }
    else if (sortKey === 'instrument') { av = a.instrument; bv = b.instrument }
    else if (sortKey === 'fee') { return sortDir === 'asc' ? a.fee - b.fee : b.fee - a.fee }
    else if (sortKey === 'status') { av = a.musician_invoice_status ?? ''; bv = b.musician_invoice_status ?? '' }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '8px 12px',
    fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
    letterSpacing: '0.02em', whiteSpace: 'nowrap', userSelect: 'none',
  }

  function Th({ label, k }: { label: string; k?: SortKey }) {
    if (!k) return <th style={thStyle}>{label}</th>
    const active = sortKey === k
    return (
      <th onClick={() => handleSort(k)} style={{ ...thStyle, cursor: 'pointer' }}>
        {label}
        <span style={{ marginLeft: 4, fontSize: 10, opacity: active ? 1 : 0.3 }}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '▲▼'}
        </span>
      </th>
    )
  }

  const filterBtn = (f: StatusFilter, label: string) => (
    <button key={f} onClick={() => setStatusFilter(f)} style={{
      padding: '5px 12px', fontSize: 12, fontWeight: statusFilter === f ? 500 : 400,
      background: statusFilter === f ? 'var(--text)' : 'none',
      color: statusFilter === f ? 'var(--bg)' : 'var(--text-secondary)',
      border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
      cursor: 'pointer', fontFamily: 'var(--font)',
    }}>
      {label}
    </button>
  )

  // Stats
  const received = rows.filter(r => r.musician_invoice_status === 'received').length
  const queried  = rows.filter(r => r.musician_invoice_status === 'queried').length
  const paid     = rows.filter(r => r.musician_invoice_status === 'paid').length
  const none     = rows.filter(r => !r.musician_invoice_status).length

  return (
    <div style={{ fontFamily: 'var(--font)' }}>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
        <span>{rows.length} slots total</span>
        <span style={{ color: '#1d4ed8' }}>{received} received</span>
        <span style={{ color: '#92400e' }}>{queried} queried</span>
        <span style={{ color: '#16a34a' }}>{paid} paid</span>
        {none > 0 && <span style={{ color: 'var(--text-tertiary)' }}>{none} awaiting</span>}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {filterBtn('all', 'All')}
        {filterBtn('none', 'Awaiting')}
        {filterBtn('received', 'Received')}
        {filterBtn('queried', 'Queried')}
        {filterBtn('paid', 'Paid')}
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          No booked slots found.
        </div>
      ) : (
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <Th label="Event date" k="event_date" />
                <Th label="Musician" k="musician" />
                <Th label="Instrument" k="instrument" />
                <Th label="Fee" k="fee" />
                <Th label="Invoice status" k="status" />
                <Th label="Invoice" />
                <Th label="Payment date" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const event = row.event
                const musician = row.musician
                const musicianName = musician ? `${musician.first_name} ${musician.last_name}` : '—'
                return (
                  <tr key={row.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {event ? (
                        <a href={`/admin/events/${event.id}?tab=musicians`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                          {formatDate(event.event_date)}
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      {musicianName}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {row.instrument}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      {fmt(row.fee)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <StatusCell slotId={row.id} status={row.musician_invoice_status} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <InvoiceCell slotId={row.id} path={row.musician_invoice_path} filename={row.musician_invoice_filename} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <PaymentDateCell slotId={row.id} date={row.musician_payment_date} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
