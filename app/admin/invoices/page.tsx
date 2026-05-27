import { createServiceClient } from '@/lib/supabase'
import { invoiceTotal } from '@/types/invoice'
import type { InvoiceLineItem } from '@/types/invoice'

function fmt(n: number) {
  return `£${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function InvoicesPage() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('invoices')
    .select('*, line_items:invoice_line_items(*), event:events(id, agency_name, agent_name, event_date, client:clients(name, email))')
    .order('created_at', { ascending: false })

  const invoices = data ?? []

  const outstanding = invoices.filter(i => i.status === 'outstanding')
  const paid = invoices.filter(i => i.status === 'paid')
  const totalOutstanding = outstanding.reduce((sum, i) => sum + invoiceTotal(i.line_items ?? []), 0)

  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '8px 12px',
    fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
    letterSpacing: '0.02em',
  }

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)', maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Invoices</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          {outstanding.length} outstanding ({fmt(totalOutstanding)}) · {paid.length} paid
        </p>
      </div>

      {invoices.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          No invoices yet.
        </div>
      ) : (
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <th style={thStyle}>Number</th>
                <th style={thStyle}>Event</th>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Event date</th>
                <th style={thStyle}>Issue date</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Sent</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const event = inv.event as { id: string; agency_name: string | null; agent_name: string | null; event_date: string | null; client?: { name: string; email: string | null } | null } | null
                const client = event?.client ?? null
                const total = invoiceTotal((inv.line_items ?? []) as InvoiceLineItem[])
                const label = event?.agency_name
                  ? (event.agent_name ? `${event.agent_name} / ${event.agency_name}` : event.agency_name)
                  : (event?.agent_name ?? '—')

                const isPaid = inv.status === 'paid'

                return (
                  <tr
                    key={inv.id}
                    style={{ borderBottom: '0.5px solid var(--border)' }}
                  >
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500 }}>
                      {event ? (
                        <a
                          href={`/admin/events/${event.id}?tab=invoices`}
                          style={{ color: 'var(--accent)', textDecoration: 'none' }}
                        >
                          {inv.number}
                        </a>
                      ) : inv.number}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text)' }}>
                      {event ? (
                        <a href={`/admin/events/${event.id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                          {label}
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {client?.name ?? '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {formatDate(event?.event_date ?? null)}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {formatDate(inv.issue_date)}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, textAlign: 'right' }}>
                      {fmt(total)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
                        background: isPaid ? '#f0fdf4' : '#fffbeb',
                        color: isPaid ? '#16a34a' : '#92400e',
                        border: `0.5px solid ${isPaid ? '#bbf7d0' : '#fde68a'}`,
                      }}>
                        {isPaid ? 'Paid' : 'Outstanding'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: inv.sent_at ? '#16a34a' : 'var(--text-tertiary)' }}>
                      {inv.sent_at ? `✓ ${formatDate(inv.sent_at)}` : 'Not sent'}
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
