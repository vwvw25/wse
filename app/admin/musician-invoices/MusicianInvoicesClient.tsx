'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateMusicianInvoiceStatus, updateMusicianPaymentDate, updateMusicianInvoiceDueDate, removeMusicianInvoice } from './actions'
import DateInput from '@/app/components/DateInput'

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
  musician_invoice_due_date: string | null
  event: { id: string; event_date: string | null; agency_name: string | null; agent_name: string | null } | null
  musician: { id: string; first_name: string; last_name: string; no_invoice_required: boolean } | null
}

function computeDefaultDueDate(eventDate: string | null): string {
  if (!eventDate) return ''
  const d = new Date(eventDate)
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]
}

function isPastDue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  received:         { label: 'Received',          color: 'var(--pill-enquiry-text)',     bg: 'var(--pill-enquiry-bg)',     border: 'transparent' },
  received_due:     { label: 'Received – due',     color: 'var(--pill-cancelled-text)',   bg: 'var(--pill-cancelled-bg)',   border: 'transparent' },
  queried:          { label: 'Queried',            color: 'var(--pill-outstanding-text)', bg: 'var(--pill-outstanding-bg)', border: 'transparent' },
  paid:             { label: 'Paid',               color: 'var(--pill-paid-text)',        bg: 'var(--pill-paid-bg)',        border: 'transparent' },
  not_received_due: { label: 'Not received – due', color: 'var(--pill-cancelled-text)',   bg: 'var(--pill-cancelled-bg)',   border: 'transparent' },
}

const inputStyle: React.CSSProperties = {
  height: 30, padding: '0 8px', fontSize: 12, boxSizing: 'border-box',
  background: 'var(--bg-secondary)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none',
}

function StatusCell({ slotId, status, dueDate, eventDate }: { slotId: string; status: string | null; dueDate: string | null; eventDate: string | null }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [current, setCurrent] = useState(status ?? '')
  const [open, setOpen] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    setCurrent(status ?? '')
  }, [status])

  function handleChange(val: string) {
    setCurrent(val)
    setOpen(false)
    startTransition(async () => {
      await updateMusicianInvoiceStatus(slotId, val || null)
      router.refresh()
    })
  }

  function handlePillClick() {
    setOpen(true)
    setTimeout(() => selectRef.current?.focus(), 0)
  }

  const effectiveDueDate = dueDate ?? computeDefaultDueDate(eventDate)
  const due = isPastDue(effectiveDueDate)
  const displayKey = current === 'received' && due ? 'received_due'
    : !current && due ? 'not_received_due'
    : current
  const cfg = STATUS_CONFIG[displayKey]

  if (open) {
    return (
      <select
        ref={selectRef}
        value={current}
        autoFocus
        onChange={e => handleChange(e.target.value)}
        onBlur={() => setOpen(false)}
        style={{ ...inputStyle, width: 160 }}
      >
        <option value="">—</option>
        <option value="received">Received</option>
        <option value="received_due">Received – due</option>
        <option value="queried">Queried</option>
        <option value="paid">Paid</option>
        <option value="not_received_due">Not received – due</option>
      </select>
    )
  }

  if (cfg) {
    return (
      <span
        onClick={handlePillClick}
        style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}`, whiteSpace: 'nowrap', cursor: 'pointer' }}
        title="Click to change"
      >
        {cfg.label}
      </span>
    )
  }

  return (
    <select
      value={current}
      onChange={e => handleChange(e.target.value)}
      style={{ ...inputStyle, width: 160 }}
    >
      <option value="">—</option>
      <option value="received">Received</option>
      <option value="received_due">Received – due</option>
      <option value="queried">Queried</option>
      <option value="paid">Paid</option>
      <option value="not_received_due">Not received – due</option>
    </select>
  )
}

function PaymentDateCell({ slotId, date }: { slotId: string; date: string | null }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [current, setCurrent] = useState(date ?? '')

  useEffect(() => {
    setCurrent(date ?? '')
  }, [date])

  function handleChange(val: string) {
    setCurrent(val)
    startTransition(async () => {
      await updateMusicianPaymentDate(slotId, val || null)
      router.refresh()
    })
  }

  return (
    <DateInput
      value={current}
      onChange={handleChange}
      style={{ ...inputStyle, width: 130 }}
    />
  )
}

function DueDateCell({ slotId, date, eventDate }: { slotId: string; date: string | null; eventDate: string | null }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const defaultVal = date ?? computeDefaultDueDate(eventDate)
  const [current, setCurrent] = useState(defaultVal)

  useEffect(() => {
    setCurrent(date ?? computeDefaultDueDate(eventDate))
  }, [date, eventDate])

  function handleChange(val: string) {
    setCurrent(val)
    startTransition(async () => {
      await updateMusicianInvoiceDueDate(slotId, val || null)
      router.refresh()
    })
  }

  return (
    <DateInput
      value={current}
      onChange={handleChange}
      style={{ ...inputStyle, width: 130 }}
    />
  )
}

function InvoiceCell({ slotId, path, filename }: { slotId: string; path: string | null; filename: string | null }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRemove() {
    if (!path || !confirm('Remove this invoice?')) return
    setRemoving(true)
    await removeMusicianInvoice(slotId, path)
    setRemoving(false)
    router.refresh()
  }

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
        <a
          href={`/api/admin/musician-invoices/${slotId}/file`}
          target="_blank"
          rel="noopener noreferrer"
          title={filename ?? 'View invoice'}
          style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
        >
          <svg width="22" height="26" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 1h11l7 7v17a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" fill="var(--bg)" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M14 1v6a1 1 0 0 0 1 1h6" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="5" y1="13" x2="17" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="5" y1="17" x2="17" y2="17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="5" y1="21" x2="11" y2="21" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </a>
        <button
          onClick={() => fileRef.current?.click()}
          title="Replace file"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-tertiary)', padding: 0, fontFamily: 'var(--font)' }}
        >
          Replace
        </button>
        <button
          onClick={handleRemove}
          disabled={removing}
          title="Remove invoice"
          style={{ background: 'none', border: 'none', cursor: removing ? 'default' : 'pointer', fontSize: 11, color: 'var(--pill-cancelled-text)', padding: 0, fontFamily: 'var(--font)', opacity: removing ? 0.5 : 1 }}
        >
          {removing ? 'Removing…' : 'Remove'}
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
      {error && <span style={{ fontSize: 11, color: 'var(--pill-cancelled-text)' }}>{error}</span>}
    </div>
  )
}


type SortKey = 'event_date' | 'musician' | 'instrument' | 'fee' | 'status'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'received' | 'queried' | 'paid' | 'none' | 'received_due' | 'not_received_due'

export default function MusicianInvoicesClient({ rows }: { rows: MusicianInvoiceRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('event_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showInternal, setShowInternal] = useState(false)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const internalCount = rows.filter(r => r.musician?.no_invoice_required).length
  const visibleRows = showInternal ? rows : rows.filter(r => !r.musician?.no_invoice_required)

  const filtered = visibleRows.filter(r => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'none') return !r.musician_invoice_status
    if (statusFilter === 'received_due') return r.musician_invoice_status === 'received' && isPastDue(r.musician_invoice_due_date ?? computeDefaultDueDate(r.event?.event_date ?? null))
    if (statusFilter === 'not_received_due') return !r.musician_invoice_status && isPastDue(r.musician_invoice_due_date ?? computeDefaultDueDate(r.event?.event_date ?? null))
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
  const received        = visibleRows.filter(r => r.musician_invoice_status === 'received').length
  const queried         = visibleRows.filter(r => r.musician_invoice_status === 'queried').length
  const paid            = visibleRows.filter(r => r.musician_invoice_status === 'paid').length
  const none            = visibleRows.filter(r => !r.musician_invoice_status).length
  const effectiveDue = (r: MusicianInvoiceRow) => isPastDue(r.musician_invoice_due_date ?? computeDefaultDueDate(r.event?.event_date ?? null))
  const receivedDue     = visibleRows.filter(r => r.musician_invoice_status === 'received' && effectiveDue(r)).length
  const notReceivedDue  = visibleRows.filter(r => !r.musician_invoice_status && effectiveDue(r)).length

  const unpaid = visibleRows.filter(r => r.musician_invoice_status !== 'paid')
  const totalUnpaidDue    = unpaid.filter(r => effectiveDue(r)).reduce((s, r) => s + r.fee, 0)
  const totalUnpaidNotDue = unpaid.filter(r => !effectiveDue(r)).reduce((s, r) => s + r.fee, 0)

  return (
    <div style={{ fontFamily: 'var(--font)' }}>
      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ padding: '20px 20px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg)', border: '0.5px solid var(--pill-cancelled-bg)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--pill-cancelled-text)', marginBottom: 10 }}>Unpaid — overdue</div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--text)' }}>{fmt(totalUnpaidDue)}</div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--text-tertiary)' }}>{unpaid.filter(r => effectiveDue(r)).length} invoices past due date</div>
        </div>
        <div style={{ padding: '20px 20px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg)', border: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>Unpaid — not yet due</div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--text)' }}>{fmt(totalUnpaidNotDue)}</div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--text-tertiary)' }}>{unpaid.filter(r => !effectiveDue(r)).length} invoices pending</div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
        <span>{visibleRows.length} slots total</span>
        <span style={{ color: 'var(--pill-enquiry-text)' }}>{received} received</span>
        <span style={{ color: 'var(--pill-outstanding-text)' }}>{queried} queried</span>
        <span style={{ color: 'var(--pill-paid-bg)' }}>{paid} paid</span>
        {none > 0 && <span style={{ color: 'var(--text-tertiary)' }}>{none} awaiting</span>}
        {receivedDue > 0 && <span style={{ color: 'var(--pill-cancelled-text)' }}>{receivedDue} received overdue</span>}
        {notReceivedDue > 0 && <span style={{ color: 'var(--pill-cancelled-text)' }}>{notReceivedDue} not received overdue</span>}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {filterBtn('all', 'All')}
        {filterBtn('none', 'Awaiting')}
        {filterBtn('received', 'Received')}
        {filterBtn('queried', 'Queried')}
        {filterBtn('paid', 'Paid')}
        {filterBtn('received_due', `Received – overdue${receivedDue > 0 ? ` (${receivedDue})` : ''}`)}
        {filterBtn('not_received_due', `Not received – overdue${notReceivedDue > 0 ? ` (${notReceivedDue})` : ''}`)}
        {internalCount > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginLeft: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={showInternal} onChange={e => setShowInternal(e.target.checked)} />
            Show internal ({internalCount})
          </label>
        )}
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
                <Th label="Due date" />
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
                      <StatusCell slotId={row.id} status={row.musician_invoice_status} dueDate={row.musician_invoice_due_date} eventDate={row.event?.event_date ?? null} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <InvoiceCell slotId={row.id} path={row.musician_invoice_path} filename={row.musician_invoice_filename} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <DueDateCell slotId={row.id} date={row.musician_invoice_due_date} eventDate={row.event?.event_date ?? null} />
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
