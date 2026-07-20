'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { invoiceTotal } from '@/types/invoice'
import type { InvoiceLineItem } from '@/types/invoice'
import type { ScopedEvent } from '@/lib/invoice-scope'
import { updateInvoiceStatus, updateInvoicePaidDate, updateInvoiceAmountReceived, updateInvoiceNotes } from './actions'
import InvoiceSummaryCards from '../InvoiceSummaryCards'

function fmt(n: number) {
  return `£${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function isPastDue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}
function computeDefaultDueDate(eventDate: string | null): string | null {
  if (!eventDate) return null
  const d = new Date(eventDate)
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]
}

type SortKey = 'number' | 'event_date' | 'issue_date' | 'total' | 'status' | 'sent_at'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'unsent' | 'sent' | 'invoiced_due' | 'chased' | 'paid' | 'paid_incorrect_amount' | 'not_invoiced'

export type InvoiceRow = {
  id: string
  number: string
  status: string
  sent_at: string | null
  issue_date: string | null
  due_date: string | null
  paid_date: string | null
  amount_received: number | null
  notes: string | null
  line_items: InvoiceLineItem[]
  event: {
    id: string
    agency_name: string | null
    agent_name: string | null
    event_date: string | null
    client: { name: string; email: string | null } | null
  } | null
}

export type { ScopedEvent }

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ marginLeft: 4, fontSize: 10, opacity: active ? 1 : 0.3, color: 'var(--text-secondary)' }}>
      {active ? (dir === 'asc' ? '▲' : '▼') : '▲▼'}
    </span>
  )
}

const STATUS_LABELS: Record<string, string> = {
  confirmed_stc: 'Confirmed STC',
  contracted: 'Contracted',
}

const inputStyle: React.CSSProperties = {
  height: 30, padding: '0 8px', fontSize: 12, boxSizing: 'border-box',
  background: 'var(--bg-secondary)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  unsent:                 { label: 'Unsent',                  color: 'var(--text-tertiary)',         bg: 'var(--bg-secondary)' },
  sent:                   { label: 'Sent',                    color: 'var(--pill-stc-text)',         bg: 'var(--pill-stc-bg)' },
  invoiced_due:           { label: 'Invoiced – due',           color: 'var(--pill-cancelled-text)',   bg: 'var(--pill-cancelled-bg)' },
  chased:                 { label: 'Chased',                  color: 'var(--pill-outstanding-text)', bg: 'var(--pill-outstanding-bg)' },
  paid:                   { label: 'Paid',                    color: 'var(--pill-paid-text)',        bg: 'var(--pill-paid-bg)' },
  paid_incorrect_amount:  { label: 'Paid – incorrect amount',  color: 'var(--pill-outstanding-text)', bg: 'var(--pill-outstanding-bg)' },
}

function StatusCell({ invoiceId, status, dueDate }: { invoiceId: string; status: string; dueDate: string | null }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [current, setCurrent] = useState(status)

  function handleChange(val: string) {
    setCurrent(val)
    startTransition(async () => {
      await updateInvoiceStatus(invoiceId, val)
      router.refresh()
    })
  }

  const overdue = current === 'sent' && isPastDue(dueDate)
  const displayKey = overdue ? 'invoiced_due' : current
  const cfg = STATUS_CONFIG[displayKey] ?? STATUS_CONFIG.unsent

  return (
    <select
      value={current}
      onChange={e => handleChange(e.target.value)}
      style={{
        ...inputStyle, width: 190, fontWeight: 500, cursor: 'pointer',
        background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.bg}`,
      }}
    >
      <option value="unsent">Unsent</option>
      <option value="sent">{overdue ? 'Invoiced – due' : 'Sent'}</option>
      <option value="chased">Chased</option>
      <option value="paid">Paid</option>
      <option value="paid_incorrect_amount">Paid – incorrect amount</option>
    </select>
  )
}

function PaidDateCell({ invoiceId, date }: { invoiceId: string; date: string | null }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [current, setCurrent] = useState(date ?? '')

  function handleChange(val: string) {
    setCurrent(val)
    startTransition(async () => {
      await updateInvoicePaidDate(invoiceId, val || null)
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

function AmountReceivedCell({ invoiceId, amount, total }: { invoiceId: string; amount: number | null; total: number }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [current, setCurrent] = useState(amount != null ? String(amount) : '')

  function commit() {
    const trimmed = current.trim()
    const parsed = trimmed === '' ? null : parseFloat(trimmed)
    const value = parsed != null && Number.isNaN(parsed) ? null : parsed
    setCurrent(value != null ? String(value) : '')
    startTransition(async () => {
      await updateInvoiceAmountReceived(invoiceId, value)
      router.refresh()
    })
  }

  const mismatch = amount != null && Math.abs(amount - total) > 0.005

  return (
    <div
      title={mismatch ? `Differs from invoiced total of ${fmt(total)}` : undefined}
      style={{ position: 'relative', width: 100 }}
    >
      <span style={{
        position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
        fontSize: 12, color: mismatch ? 'var(--pill-outstanding-text)' : 'var(--text-tertiary)', pointerEvents: 'none',
      }}>£</span>
      <input
        type="text"
        inputMode="decimal"
        value={current}
        onChange={e => setCurrent(e.target.value)}
        onBlur={commit}
        placeholder="0.00"
        style={{
          ...inputStyle, width: '100%', textAlign: 'right', paddingLeft: 18, boxSizing: 'border-box',
          color: mismatch ? 'var(--pill-outstanding-text)' : 'var(--text)',
          background: mismatch ? 'var(--pill-outstanding-bg)' : 'var(--bg-secondary)',
          border: `0.5px solid ${mismatch ? 'var(--pill-outstanding-text)' : 'var(--border)'}`,
        }}
      />
    </div>
  )
}

function NotesCell({ invoiceId, notes }: { invoiceId: string; notes: string | null }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [value, setValue] = useState(notes ?? '')

  function commit() {
    startTransition(async () => {
      await updateInvoiceNotes(invoiceId, value.trim() || null)
      router.refresh()
    })
  }

  return (
    <input
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={commit}
      placeholder="Add note…"
      style={{ ...inputStyle, width: 160 }}
    />
  )
}

export default function InvoicesClient({
  invoices,
  scopedEvents,
}: {
  invoices: InvoiceRow[]
  scopedEvents: ScopedEvent[]
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('event_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [uninvoicedSortDir, setUninvoicedSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const isDue = (i: InvoiceRow) => i.status === 'sent' && isPastDue(i.due_date ?? computeDefaultDueDate(i.event?.event_date ?? null))

  const unpaid = invoices.filter(i => i.status !== 'paid' && i.status !== 'paid_incorrect_amount')
  const paid = invoices.filter(i => i.status === 'paid' || i.status === 'paid_incorrect_amount')
  const totalOutstanding = unpaid.reduce((sum, i) => sum + invoiceTotal(i.line_items), 0)
  const totalPaid = paid.reduce((sum, i) => sum + invoiceTotal(i.line_items), 0)

  // Past, confirmed_stc/contracted gigs — scope for the Total outstanding / Uninvoiced cards
  const uninvoicedEvents = scopedEvents.filter(e => e.isUninvoiced)
  const totalOutstandingScoped = scopedEvents.reduce((sum, e) => sum + e.amount, 0)
  const scopedOwingCount = scopedEvents.filter(e => e.amount > 0.005).length
  const totalUninvoiced = uninvoicedEvents.reduce((sum, e) => sum + e.amount, 0)

  const rows = useMemo(() => {
    const filtered = statusFilter === 'all'
      ? invoices
      : statusFilter === 'not_invoiced'
      ? []
      : statusFilter === 'invoiced_due'
      ? invoices.filter(isDue)
      : invoices.filter(i => i.status === statusFilter)

    return [...filtered].sort((a, b) => {
      let av: string | number = 0
      let bv: string | number = 0

      if (sortKey === 'number') {
        av = a.number; bv = b.number
      } else if (sortKey === 'event_date') {
        av = a.event?.event_date ?? ''; bv = b.event?.event_date ?? ''
      } else if (sortKey === 'issue_date') {
        av = a.issue_date ?? ''; bv = b.issue_date ?? ''
      } else if (sortKey === 'total') {
        av = invoiceTotal(a.line_items); bv = invoiceTotal(b.line_items)
      } else if (sortKey === 'status') {
        av = a.status; bv = b.status
      } else if (sortKey === 'sent_at') {
        av = a.sent_at ?? ''; bv = b.sent_at ?? ''
      }

      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [invoices, statusFilter, sortKey, sortDir])

  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '8px 12px',
    fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
    letterSpacing: '0.02em', whiteSpace: 'nowrap',
    userSelect: 'none',
  }

  function Th({ label, sortable, k, right }: { label: string; sortable?: SortKey; k?: string; right?: boolean }) {
    if (!sortable) return <th key={k} style={{ ...thStyle, textAlign: right ? 'right' : 'left' }}>{label}</th>
    return (
      <th
        key={k}
        onClick={() => handleSort(sortable)}
        style={{ ...thStyle, textAlign: right ? 'right' : 'left', cursor: 'pointer' }}
      >
        {label}<SortIcon active={sortKey === sortable} dir={sortDir} />
      </th>
    )
  }

  const filterBtn = (f: StatusFilter, label: string, count: number) => (
    <button key={f} onClick={() => setStatusFilter(f)} style={{
      padding: '5px 12px', fontSize: 12, fontWeight: statusFilter === f ? 500 : 400,
      background: statusFilter === f ? 'var(--text)' : 'none',
      color: statusFilter === f ? 'var(--bg)' : 'var(--text-secondary)',
      border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
      cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
    }}>
      {label} <span style={{ opacity: 0.6 }}>{count}</span>
    </button>
  )

  return (
    <div style={{ fontFamily: 'var(--font)' }}>
      {/* Dashboard cards */}
      <InvoiceSummaryCards
        totalOutstanding={totalOutstanding}
        unpaidCount={unpaid.length}
        totalUninvoiced={totalUninvoiced}
        uninvoicedCount={uninvoicedEvents.length}
        totalOutstandingScoped={totalOutstandingScoped}
        scopedOwingCount={scopedOwingCount}
        activeFilter={statusFilter === 'sent' ? 'unpaid' : statusFilter === 'not_invoiced' ? 'uninvoiced' : null}
        onSelectUnpaid={() => setStatusFilter(f => f === 'sent' ? 'all' : 'sent')}
        onSelectUninvoiced={() => setStatusFilter(f => f === 'not_invoiced' ? 'all' : 'not_invoiced')}
      />

      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
        {filterBtn('all', 'All', invoices.length)}
        {filterBtn('unsent', 'Unsent', invoices.filter(i => i.status === 'unsent').length)}
        {filterBtn('sent', 'Sent', invoices.filter(i => i.status === 'sent').length)}
        {filterBtn('invoiced_due', 'Invoiced – due', invoices.filter(isDue).length)}
        {filterBtn('chased', 'Chased', invoices.filter(i => i.status === 'chased').length)}
        {filterBtn('paid', 'Paid', invoices.filter(i => i.status === 'paid').length)}
        {filterBtn('paid_incorrect_amount', 'Paid – incorrect amt', invoices.filter(i => i.status === 'paid_incorrect_amount').length)}
      </div>

      {/* Not invoiced table */}
      {statusFilter === 'not_invoiced' ? (
        uninvoicedEvents.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            All past contracted gigs have been invoiced.
          </div>
        ) : (
          <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  <th style={thStyle}>Event</th>
                  <th style={thStyle}>Client</th>
                  <th
                    style={{ ...thStyle, cursor: 'pointer' }}
                    onClick={() => setUninvoicedSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  >
                    Event date <SortIcon active dir={uninvoicedSortDir} />
                  </th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {[...uninvoicedEvents]
                  .sort((a, b) => {
                    const cmp = (a.event_date ?? '').localeCompare(b.event_date ?? '')
                    return uninvoicedSortDir === 'asc' ? cmp : -cmp
                  })
                  .map(ev => {
                    const label = ev.agency_name
                      ? (ev.agent_name ? `${ev.agent_name} / ${ev.agency_name}` : ev.agency_name)
                      : (ev.agent_name ?? '—')
                    return (
                      <tr key={ev.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text)' }}>
                          <a href={`/admin/events/${ev.id}?tab=invoices`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{label}</a>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{ev.client?.name ?? '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(ev.event_date)}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }}>
                            {STATUS_LABELS[ev.status] ?? ev.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <a href={`/admin/events/${ev.id}?tab=invoices`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Manage invoices →</a>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )
      ) : rows.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          No invoices match.
        </div>
      ) : (
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1550 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <Th label="Number" sortable="number" />
                <Th label="Event" />
                <Th label="Client" />
                <Th label="Event date" sortable="event_date" />
                <Th label="Issue date" sortable="issue_date" />
                <Th label="Due date" />
                <Th label="Total" sortable="total" right />
                <Th label="Status" sortable="status" />
                <Th label="Date sent" sortable="sent_at" />
                <Th label="Amount received" right />
                <Th label="Paid date" />
                <Th label="Notes" />
              </tr>
            </thead>
            <tbody>
              {rows.map(inv => {
                const event = inv.event
                const client = event?.client ?? null
                const total = invoiceTotal(inv.line_items)
                const label = event?.agency_name
                  ? (event.agent_name ? `${event.agent_name} / ${event.agency_name}` : event.agency_name)
                  : (event?.agent_name ?? '—')
                const effectiveDueDate = inv.due_date ?? computeDefaultDueDate(event?.event_date ?? null)
                const dueDateIsDefault = !inv.due_date && !!effectiveDueDate

                return (
                  <tr key={inv.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500 }}>
                      {event ? (
                        <a href={`/admin/events/${event.id}?tab=invoices`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{inv.number}</a>
                      ) : inv.number}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text)' }}>
                      {event ? (
                        <a href={`/admin/events/${event.id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{label}</a>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{client?.name ?? '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(event?.event_date ?? null)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(inv.issue_date)}</td>
                    <td
                      style={{ padding: '10px 12px', fontSize: 13, color: dueDateIsDefault ? 'var(--text-tertiary)' : 'var(--text-secondary)', fontStyle: dueDateIsDefault ? 'italic' : 'normal', whiteSpace: 'nowrap' }}
                      title={dueDateIsDefault ? 'Defaulted to 30 days after the event date — not explicitly set' : undefined}
                    >
                      {formatDate(effectiveDueDate)}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(total)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <StatusCell invoiceId={inv.id} status={inv.status} dueDate={effectiveDueDate} />
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: inv.sent_at ? 'var(--pill-stc-text)' : 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {inv.sent_at ? `✓ ${formatDate(inv.sent_at)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <AmountReceivedCell invoiceId={inv.id} amount={inv.amount_received} total={total} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <PaidDateCell invoiceId={inv.id} date={inv.paid_date} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <NotesCell invoiceId={inv.id} notes={inv.notes} />
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
