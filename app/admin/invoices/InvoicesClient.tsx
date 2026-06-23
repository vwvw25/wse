'use client'

import { useState, useMemo } from 'react'
import { invoiceTotal } from '@/types/invoice'
import type { InvoiceLineItem } from '@/types/invoice'

function fmt(n: number) {
  return `£${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

type SortKey = 'number' | 'event_date' | 'issue_date' | 'total' | 'status' | 'sent_at'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'unsent' | 'sent' | 'chased' | 'paid' | 'not_invoiced'

export type InvoiceRow = {
  id: string
  number: string
  status: string
  sent_at: string | null
  issue_date: string | null
  due_date: string | null
  line_items: InvoiceLineItem[]
  event: {
    id: string
    agency_name: string | null
    agent_name: string | null
    event_date: string | null
    client: { name: string; email: string | null } | null
  } | null
}

export type UninvoicedEvent = {
  id: string
  agency_name: string | null
  agent_name: string | null
  event_date: string | null
  status: string
  booked_fee: number | null
  client: { name: string; email: string | null } | null
}

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

export default function InvoicesClient({
  invoices,
  uninvoicedEvents,
}: {
  invoices: InvoiceRow[]
  uninvoicedEvents: UninvoicedEvent[]
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

  const unpaid = invoices.filter(i => i.status !== 'paid')
  const paid = invoices.filter(i => i.status === 'paid')
  const totalOutstanding = unpaid.reduce((sum, i) => sum + invoiceTotal(i.line_items), 0)
  const totalPaid = paid.reduce((sum, i) => sum + invoiceTotal(i.line_items), 0)
  const totalUninvoiced = uninvoicedEvents.reduce((sum, e) => sum + (e.booked_fee ?? 0), 0)

  const rows = useMemo(() => {
    const filtered = statusFilter === 'all'
      ? invoices
      : statusFilter === 'not_invoiced'
      ? []
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
      cursor: 'pointer', fontFamily: 'var(--font)',
    }}>
      {label} <span style={{ opacity: 0.6 }}>{count}</span>
    </button>
  )

  return (
    <div style={{ fontFamily: 'var(--font)' }}>
      {/* Dashboard cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>

        {/* Card 1: Unpaid invoices — clickable */}
        <div
          onClick={() => setStatusFilter(f => f === 'sent' ? 'all' : 'sent')}
          style={{
            padding: '20px 20px 16px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
            border: `0.5px solid ${statusFilter === 'sent' ? 'var(--text)' : 'var(--border)'}`,
            background: statusFilter === 'sent' ? 'var(--text)' : 'var(--bg)',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10, color: statusFilter === 'sent' ? 'rgba(255,255,255,0.55)' : 'var(--text-secondary)' }}>
            Unpaid invoices
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: statusFilter === 'sent' ? '#fff' : 'var(--text)', lineHeight: 1 }}>
            {fmt(totalOutstanding)}
          </div>
          <div style={{ fontSize: 12, marginTop: 8, color: statusFilter === 'sent' ? 'rgba(255,255,255,0.45)' : 'var(--text-tertiary)' }}>
            {unpaid.length} invoice{unpaid.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Card 2: Uninvoiced — clickable */}
        {(() => {
          const hasAny = uninvoicedEvents.length > 0
          const isActive = statusFilter === 'not_invoiced'
          const bg = isActive ? '#ff3b5c' : hasAny ? '#ff5470' : 'var(--bg)'
          const labelCol = isActive || hasAny ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)'
          const amountCol = isActive || hasAny ? '#fff' : 'var(--text)'
          const subCol = isActive || hasAny ? 'rgba(255,255,255,0.55)' : 'var(--text-tertiary)'
          const borderCol = isActive ? '#cc1f40' : hasAny ? '#ff3b5c' : 'var(--border)'
          return (
            <div
              onClick={() => setStatusFilter(f => f === 'not_invoiced' ? 'all' : 'not_invoiced')}
              style={{ padding: '20px 20px 16px', borderRadius: 'var(--radius-lg)', cursor: 'pointer', border: `0.5px solid ${borderCol}`, background: bg, transition: 'all 0.15s' }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10, color: labelCol }}>Uninvoiced</div>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: amountCol }}>{fmt(totalUninvoiced)}</div>
              <div style={{ fontSize: 12, marginTop: 8, color: subCol }}>{uninvoicedEvents.length} gig{uninvoicedEvents.length !== 1 ? 's' : ''} without invoice</div>
            </div>
          )
        })()}

        {/* Card 3: Total outstanding (unpaid + uninvoiced combined) */}
        <div style={{
          padding: '20px 20px 16px', borderRadius: 'var(--radius-lg)',
          border: '0.5px solid var(--border)', background: 'var(--bg-secondary)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--text-secondary)' }}>
            Total outstanding
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
            {fmt(totalOutstanding + totalUninvoiced)}
          </div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--text-tertiary)' }}>
            {unpaid.length + uninvoicedEvents.length} unpaid or uninvoiced
          </div>
        </div>

      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 16 }}>
        {filterBtn('all', 'All', invoices.length)}
        {filterBtn('unsent', 'Unsent', invoices.filter(i => i.status === 'unsent').length)}
        {filterBtn('sent', 'Sent', invoices.filter(i => i.status === 'sent').length)}
        {filterBtn('chased', 'Chased', invoices.filter(i => i.status === 'chased').length)}
        {filterBtn('paid', 'Paid', paid.length)}
      </div>

      {/* Not invoiced table */}
      {statusFilter === 'not_invoiced' ? (
        uninvoicedEvents.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            All contracted gigs have been invoiced.
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
                          <a href={`/admin/events/${ev.id}?tab=invoices`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Create invoice →</a>
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
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <Th label="Number" sortable="number" />
                <Th label="Event" />
                <Th label="Client" />
                <Th label="Event date" sortable="event_date" />
                <Th label="Issue date" sortable="issue_date" />
                <Th label="Total" sortable="total" right />
                <Th label="Status" sortable="status" />
                <Th label="Date sent" sortable="sent_at" />
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
                const pillCfg =
                  inv.status === 'paid'    ? { bg: 'var(--pill-paid-bg)',         color: 'var(--pill-paid-text)',         label: 'Paid' } :
                  inv.status === 'chased'  ? { bg: 'var(--pill-outstanding-bg)',   color: 'var(--pill-outstanding-text)',  label: 'Chased' } :
                  inv.status === 'sent'    ? { bg: 'var(--pill-stc-bg)',           color: 'var(--pill-stc-text)',          label: 'Sent' } :
                                             { bg: 'var(--bg-secondary)',           color: 'var(--text-tertiary)',          label: 'Unsent' }

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
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(total)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: pillCfg.bg, color: pillCfg.color }}>
                        {pillCfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: inv.sent_at ? 'var(--pill-stc-text)' : 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {inv.sent_at ? `✓ ${formatDate(inv.sent_at)}` : '—'}
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
