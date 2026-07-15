'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Invoice, InvoiceLineItem, InvoiceSettings } from '@/types/invoice'
import { invoiceSubtotal, invoiceVatTotal, invoiceTotal } from '@/types/invoice'
import {
  createInvoice, updateInvoice, deleteInvoice,
  upsertLineItem, deleteLineItem, markInvoiceSent,
} from './invoice-actions'
import InvoiceEmailModal from './InvoiceEmailModal'

const inputStyle: React.CSSProperties = {
  height: 30, padding: '0 8px', fontSize: 12,
  background: 'var(--bg)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
}

function fmt(n: number) {
  return `£${n.toFixed(2)}`
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Line item row ─────────────────────────────────────────────────────────────
function LineItemRow({
  item,
  eventId,
  vatRegistered,
  onDelete,
}: {
  item: InvoiceLineItem
  eventId: string
  vatRegistered: boolean
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(item.description)
  const [cost, setCost] = useState(String(item.cost))
  const [vatRate, setVatRate] = useState(String(item.vat_rate))
  const [, startTransition] = useTransition()

  const vat = (item.cost * item.vat_rate) / 100
  const amount = item.cost + vat

  function save() {
    startTransition(async () => {
      await upsertLineItem(eventId, {
        id: item.id,
        invoice_id: item.invoice_id,
        description: desc,
        cost: parseFloat(cost) || 0,
        vat_rate: parseFloat(vatRate) || 0,
      })
      setEditing(false)
    })
  }

  return (
    <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
      <td style={{ padding: '7px 8px 7px 0' }}>
        {editing ? <input style={{ ...inputStyle, width: '100%' }} value={desc} onChange={e => setDesc(e.target.value)} /> : <span style={{ fontSize: 13 }}>{item.description}</span>}
      </td>
      <td style={{ padding: '7px 8px', textAlign: 'right' }}>
        {editing ? <input style={{ ...inputStyle, width: 80, textAlign: 'right' }} type="number" value={cost} onChange={e => setCost(e.target.value)} /> : <span style={{ fontSize: 13 }}>{fmt(item.cost)}</span>}
      </td>
      {vatRegistered && (
        <td style={{ padding: '7px 8px', textAlign: 'right' }}>
          {editing
            ? <select style={{ ...inputStyle, width: 72 }} value={vatRate} onChange={e => setVatRate(e.target.value)}>
                <option value="0">0%</option>
                <option value="20">20%</option>
              </select>
            : <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.vat_rate > 0 ? `${fmt(vat)} (${item.vat_rate}%)` : '—'}</span>
          }
        </td>
      )}
      <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 500, fontSize: 13 }}>{fmt(amount)}</td>
      <td style={{ padding: '7px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {editing
          ? <>
              <button onClick={save} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font)', padding: '2px 6px' }}>Save</button>
              <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font)', padding: '2px 6px' }}>Cancel</button>
            </>
          : <>
              <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font)', padding: '2px 6px' }}>Edit</button>
              <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-danger)', fontFamily: 'var(--font)', padding: '2px 6px' }}>✕</button>
            </>
        }
      </td>
    </tr>
  )
}

// ── Single invoice card ───────────────────────────────────────────────────────
function InvoiceCard({
  invoice,
  eventId,
  eventDate,
  vatRegistered,
  onDelete,
  clientEmail,
  adminEmail,
  subjectTemplate,
  bodyTemplate,
  clientName,
}: {
  invoice: Invoice & { line_items: InvoiceLineItem[] }
  eventId: string
  eventDate: string | null
  vatRegistered: boolean
  onDelete: () => void
  clientEmail: string | null
  adminEmail: string | null
  subjectTemplate: string
  bodyTemplate: string
  clientName: string | null
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [newCost, setNewCost] = useState('')
  const [newVat, setNewVat] = useState('0')
  const [autoSendType, setAutoSendType] = useState<'none' | 'day_of' | 'date'>(
    invoice.auto_send_day_of_event ? 'day_of' : invoice.auto_send_at ? 'date' : 'none'
  )
  const [autoSendDate, setAutoSendDate] = useState(invoice.auto_send_at?.split('T')[0] ?? '')
  const [, startTransition] = useTransition()

  const items = invoice.line_items ?? []
  const subtotal = invoiceSubtotal(items)
  const vatTotal = invoiceVatTotal(items)
  const total = invoiceTotal(items)

  function addItem() {
    if (!newDesc.trim()) return
    startTransition(async () => {
      await upsertLineItem(eventId, {
        invoice_id: invoice.id,
        description: newDesc.trim(),
        cost: parseFloat(newCost) || 0,
        vat_rate: parseFloat(newVat) || 0,
      })
      setNewDesc(''); setNewCost(''); setNewVat('0'); setAddingItem(false)
    })
  }

  function handleAutoSend(type: 'none' | 'day_of' | 'date', date?: string) {
    startTransition(async () => {
      await updateInvoice(invoice.id, eventId, {
        auto_send_day_of_event: type === 'day_of',
        auto_send_at: type === 'date' && date ? new Date(date).toISOString() : null,
      })
    })
  }

  const statusCfg = invoice.status === 'paid'
    ? { label: 'Paid', color: 'var(--pill-paid-text)', bg: 'var(--pill-paid-bg)', border: 'var(--pill-paid-text)' }
    : invoice.status === 'paid_incorrect_amount'
    ? { label: 'Paid – incorrect amount', color: 'var(--pill-outstanding-text)', bg: 'var(--pill-outstanding-bg)', border: 'var(--pill-outstanding-text)' }
    : invoice.status === 'chased'
    ? { label: 'Chased', color: 'var(--pill-outstanding-text)', bg: 'var(--pill-outstanding-bg)', border: 'var(--pill-outstanding-text)' }
    : invoice.status === 'sent'
    ? { label: 'Sent', color: 'var(--pill-stc-text)', bg: 'var(--pill-stc-bg)', border: 'var(--pill-stc-text)' }
    : { label: 'Unsent', color: 'var(--text-tertiary)', bg: 'var(--bg-secondary)', border: 'var(--border)' }

  return (
    <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 12 }}>
      {/* Invoice header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'var(--bg-secondary)', cursor: 'pointer',
          borderBottom: expanded ? '0.5px solid var(--border)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{invoice.number}</span>
          <span style={{
            fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
            background: statusCfg.bg, color: statusCfg.color, border: `0.5px solid ${statusCfg.border}`,
          }}>{statusCfg.label}</span>
          {invoice.sent_at
            ? <span style={{ fontSize: 11, color: 'var(--pill-stc-text)' }}>✓ Sent {formatDate(invoice.sent_at)}</span>
            : <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Not sent</span>
          }
          {invoice.due_date && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Due {formatDate(invoice.due_date)}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{fmt(total)}</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '14px' }}>
          {/* Settings row */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</span>
              <select
                value={invoice.status}
                onChange={e => startTransition(async () => updateInvoice(invoice.id, eventId, { status: e.target.value }))}
                style={{ ...inputStyle, width: 120 }}
              >
                <option value="unsent">Unsent</option>
                <option value="sent">Sent</option>
                <option value="chased">Chased</option>
                <option value="paid">Paid</option>
                <option value="paid_incorrect_amount">Paid – incorrect amount</option>
              </select>
            </div>
            {/* Issue date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Issue date</span>
              <input type="date" style={{ ...inputStyle, width: 140 }} value={invoice.issue_date ?? ''} onChange={e => startTransition(async () => updateInvoice(invoice.id, eventId, { issue_date: e.target.value || null }))} />
            </div>
            {/* Due date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Due date</span>
              <input type="date" style={{ ...inputStyle, width: 140 }} value={invoice.due_date ?? ''} onChange={e => startTransition(async () => updateInvoice(invoice.id, eventId, { due_date: e.target.value || null }))} />
            </div>
            {/* PO number */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>PO</span>
              <input style={{ ...inputStyle, width: 100 }} placeholder="Optional" defaultValue={invoice.po_number ?? ''} onBlur={e => startTransition(async () => updateInvoice(invoice.id, eventId, { po_number: e.target.value || null }))} />
            </div>
          </div>

          {/* Auto-send */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Auto-send</span>
            <select
              value={autoSendType}
              onChange={e => {
                const t = e.target.value as typeof autoSendType
                setAutoSendType(t)
                if (t !== 'date') handleAutoSend(t)
              }}
              style={{ ...inputStyle, width: 140 }}
            >
              <option value="none">Off</option>
              <option value="day_of">Day of event</option>
              <option value="date">Specific date</option>
            </select>
            {autoSendType === 'date' && (
              <input
                type="date"
                style={{ ...inputStyle, width: 140 }}
                value={autoSendDate}
                onChange={e => {
                  setAutoSendDate(e.target.value)
                  if (e.target.value) handleAutoSend('date', e.target.value)
                }}
              />
            )}
            {autoSendType === 'day_of' && eventDate && (
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Will send on {formatDate(eventDate)}</span>
            )}
          </div>

          {/* Line items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '5px 8px 5px 0', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Description</th>
                <th style={{ textAlign: 'right', padding: '5px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Cost</th>
                {vatRegistered && <th style={{ textAlign: 'right', padding: '5px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>VAT</th>}
                <th style={{ textAlign: 'right', padding: '5px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  eventId={eventId}
                  vatRegistered={vatRegistered}
                  onDelete={() => startTransition(async () => deleteLineItem(item.id, eventId))}
                />
              ))}
              {/* Add item row */}
              {addingItem && (
                <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px 6px 0' }}>
                    <input style={{ ...inputStyle, width: '100%' }} placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} autoFocus />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input style={{ ...inputStyle, width: 80, textAlign: 'right' }} type="number" placeholder="0.00" value={newCost} onChange={e => setNewCost(e.target.value)} />
                  </td>
                  {vatRegistered && (
                    <td style={{ padding: '6px 8px' }}>
                      <select style={{ ...inputStyle, width: 72 }} value={newVat} onChange={e => setNewVat(e.target.value)}>
                        <option value="0">0%</option>
                        <option value="20">20%</option>
                      </select>
                    </td>
                  )}
                  <td />
                  <td style={{ padding: '6px 0', whiteSpace: 'nowrap' }}>
                    <button onClick={addItem} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font)', padding: '2px 6px' }}>Add</button>
                    <button onClick={() => setAddingItem(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font)', padding: '2px 6px' }}>Cancel</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <button
              onClick={() => setAddingItem(true)}
              style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 }}
            >
              + Add line item
            </button>
            <div style={{ textAlign: 'right', minWidth: 180 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Subtotal: {fmt(subtotal)}</div>
              {vatRegistered && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>VAT: {fmt(vatTotal)}</div>}
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4 }}>Total: {fmt(total)}</div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginTop: 12 }}>
            <textarea
              style={{ width: '100%', padding: '7px 10px', fontSize: 12, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)', outline: 'none', resize: 'vertical', minHeight: 52, boxSizing: 'border-box' }}
              placeholder="Invoice notes (optional)…"
              defaultValue={invoice.notes ?? ''}
              onBlur={e => startTransition(async () => updateInvoice(invoice.id, eventId, { notes: e.target.value || null }))}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setPdfOpen(true)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 500,
                background: 'var(--text)', color: 'var(--bg)', border: 'none',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
              }}
            >
              View invoice
            </button>
            <button
              onClick={() => setEmailModalOpen(true)}
              style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text)' }}
            >
              {invoice.sent_at ? 'Resend' : 'Send invoice'}
            </button>
            {!invoice.sent_at && (
              <button
                onClick={() => startTransition(async () => markInvoiceSent(invoice.id, eventId))}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text-secondary)' }}
              >
                Mark as sent
              </button>
            )}
            <button
              onClick={() => { if (confirm(`Delete invoice ${invoice.number}?`)) startTransition(async () => onDelete()) }}
              style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text-danger)', marginLeft: 'auto' }}
            >
              Delete
            </button>
          </div>

          {pdfOpen && (
            <div
              onClick={() => setPdfOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', padding: 24 }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '0.5px solid #e5e7eb', background: '#f9fafb' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font)', color: '#111' }}>{invoice.number}.pdf</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <a href={`/api/admin/invoices/${invoice.id}/pdf`} download={`${invoice.number}.pdf`} style={{ padding: '4px 12px', fontSize: 12, fontWeight: 500, background: 'none', border: '0.5px solid #d1d5db', borderRadius: 4, textDecoration: 'none', color: '#374151', fontFamily: 'var(--font)' }}>↓ Download</a>
                    <button onClick={() => setPdfOpen(false)} style={{ padding: '4px 10px', fontSize: 18, lineHeight: 1, background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>×</button>
                  </div>
                </div>
                <iframe src={`/api/admin/invoices/${invoice.id}/pdf`} style={{ flex: 1, border: 'none', width: '100%' }} title={`${invoice.number}.pdf`} />
              </div>
            </div>
          )}

          {emailModalOpen && (
            <InvoiceEmailModal
              invoiceId={invoice.id}
              invoiceNumber={invoice.number}
              clientEmail={clientEmail}
              adminEmail={adminEmail}
              subjectTemplate={subjectTemplate}
              bodyTemplate={bodyTemplate}
              tokens={{
                client_name: clientName ?? '',
                invoice_number: invoice.number,
                event_date: eventDate ? new Date(eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
                total: `£${total.toFixed(2)}`,
                due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
              }}
              onClose={() => setEmailModalOpen(false)}
              onSent={() => router.refresh()}
            />
          )}
        </div>
      )}
    </div>
  )
}

const DEFAULT_SUBJECT = 'Invoice {{invoice_number}} — Ward Smith Entertainment'
const DEFAULT_BODY = `Hi {{client_name}},

Please find attached invoice {{invoice_number}} for your event on {{event_date}}.

Total due: {{total}}{{due_date_line}}

Thanks again for the booking!

Many thanks,
Ward Smith Entertainment`

// ── Main component ────────────────────────────────────────────────────────────
export default function InvoiceSection({
  eventId,
  eventDate,
  invoices,
  prefillItems,
  invoiceSettings,
  clientEmail,
  clientName,
  adminEmail,
}: {
  eventId: string
  eventDate: string | null
  invoices: (Invoice & { line_items: InvoiceLineItem[] })[]
  prefillItems: { description: string; cost: number }[]
  invoiceSettings: InvoiceSettings | null
  clientEmail: string | null
  clientName: string | null
  adminEmail: string | null
}) {
  const [localInvoices, setLocalInvoices] = useState(invoices)
  const [, startTransition] = useTransition()
  const vatRegistered = invoiceSettings?.vat_registered ?? false
  const subjectTemplate = invoiceSettings?.invoice_email_subject ?? DEFAULT_SUBJECT
  const bodyTemplate = invoiceSettings?.invoice_email_body ?? DEFAULT_BODY

  function handleCreate() {
    startTransition(async () => {
      await createInvoice(eventId, prefillItems)
    })
  }

  return (
    <div>
      {localInvoices.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 12px' }}>No invoices yet.</p>
      )}

      {invoices.map(inv => (
        <InvoiceCard
          key={inv.id}
          invoice={inv}
          eventId={eventId}
          eventDate={eventDate}
          vatRegistered={vatRegistered}
          clientEmail={clientEmail}
          clientName={clientName}
          adminEmail={adminEmail}
          subjectTemplate={subjectTemplate}
          bodyTemplate={bodyTemplate}
          onDelete={() => startTransition(async () => { await deleteInvoice(inv.id, eventId); setLocalInvoices(prev => prev.filter(i => i.id !== inv.id)) })}
        />
      ))}

      <button
        onClick={handleCreate}
        style={{
          padding: '7px 16px', fontSize: 13, fontWeight: 500,
          background: 'var(--accent)', color: 'var(--accent-text-on)', border: 'none',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
        }}
      >
        + Create invoice
      </button>
    </div>
  )
}
