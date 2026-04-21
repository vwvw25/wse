import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { invoiceSubtotal, invoiceVatTotal, invoiceTotal } from '@/types/invoice'
import type { InvoiceLineItem } from '@/types/invoice'
import { sendEmail } from '@/lib/send-email'

function fmt(n: number) {
  return `£${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Re-use the same PDF styles as the download route
const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#111827', padding: 48, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 36 },
  logo: { width: 100, height: 40, objectFit: 'contain' },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#111827' },
  invoiceTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  badge: { fontSize: 9, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 12 },
  metaRow: { flexDirection: 'row', marginBottom: 4 },
  metaLabel: { width: 80, color: '#6b7280', fontSize: 9, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { color: '#111827', fontSize: 10 },
  section: { marginTop: 28 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 6, marginBottom: 2 },
  tableHeaderText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6', paddingVertical: 7 },
  col_desc: { flex: 1 },
  col_cost: { width: 80, textAlign: 'right' },
  col_vat: { width: 80, textAlign: 'right' },
  col_amount: { width: 80, textAlign: 'right' },
  totalsBox: { marginTop: 12, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', paddingVertical: 3 },
  totalLabel: { width: 120, color: '#6b7280', fontSize: 10 },
  totalValue: { width: 80, textAlign: 'right', fontSize: 10 },
  grandTotalRow: { flexDirection: 'row', paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#111827', marginTop: 4 },
  grandTotalLabel: { width: 120, fontFamily: 'Helvetica-Bold', fontSize: 11 },
  grandTotalValue: { width: 80, textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 11 },
  bankBox: { marginTop: 28, padding: 14, backgroundColor: '#f9fafb', borderRadius: 4 },
  bankTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 8 },
  bankRow: { flexDirection: 'row', marginBottom: 3 },
  notesBox: { marginTop: 16 },
  notesText: { fontSize: 10, color: '#6b7280', lineHeight: 1.5 },
  addressBlock: { fontSize: 10, color: '#374151', lineHeight: 1.5 },
  twoCol: { flexDirection: 'row', justifyContent: 'space-between' },
})

async function buildPdf(invoice: Record<string, unknown>, settings: Record<string, unknown> | null) {
  const event = invoice.event as Record<string, unknown> | null
  const client = (event?.client as Record<string, unknown> | null) ?? null
  const items = (invoice.line_items as InvoiceLineItem[]) ?? []
  const subtotal = invoiceSubtotal(items)
  const vatTotal = invoiceVatTotal(items)
  const total = invoiceTotal(items)
  const vatRegistered = (settings?.vat_registered as boolean) ?? false

  // Bill-to always comes from the linked client record
  const billToName = (client?.name as string | null) ?? 'Client'
  const billToEmail = (client?.email as string | null) ?? null
  const billToAddress = (client?.address as string | null) ?? null

  const statusColor = invoice.status === 'paid' ? '#16a34a' : '#d97706'
  const statusBg = invoice.status === 'paid' ? '#f0fdf4' : '#fffbeb'

  const pdfDoc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {(settings?.logo_url as string | null)
              ? <Image src={settings!.logo_url as string} style={styles.logo} />
              : <Text style={styles.companyName}>Ward Smith Entertainment</Text>
            }
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={{ fontSize: 11, color: '#6b7280' }}>{invoice.number as string}</Text>
          </View>
        </View>

        <View style={[styles.badge, { backgroundColor: statusBg }]}>
          <Text style={{ color: statusColor, fontFamily: 'Helvetica-Bold', fontSize: 9 }}>
            {invoice.status === 'paid' ? '✓ Paid' : 'Outstanding'}
          </Text>
        </View>

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.metaLabel, { marginBottom: 6 }]}>Bill to</Text>
            <Text style={[styles.addressBlock, { fontFamily: 'Helvetica-Bold' }]}>{billToName}</Text>
            {billToEmail && <Text style={styles.addressBlock}>{billToEmail}</Text>}
            {billToAddress && <Text style={styles.addressBlock}>{billToAddress}</Text>}
          </View>
          <View style={{ width: 180 }}>
            {([
              ['Invoice number', invoice.number as string],
              ['Issue date', formatDate(invoice.issue_date as string | null)],
              ['Due date', formatDate(invoice.due_date as string | null)],
              invoice.po_number ? ['PO number', invoice.po_number as string] : null,
              ['Event date', formatDate((event?.event_date as string | null) ?? null)],
              event?.venue_name ? ['Venue', event.venue_name as string] : null,
            ] as ([string, string] | null)[]).filter((r): r is [string, string] => r !== null).map(([label, value], i) => (
              <View key={i} style={styles.metaRow}>
                <Text style={styles.metaLabel}>{label}</Text>
                <Text style={styles.metaValue}>{value}</Text>
              </View>
            ))}
            {vatRegistered && (settings?.vat_number as string | null) && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>VAT no.</Text>
                <Text style={styles.metaValue}>{settings!.vat_number as string}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col_desc]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.col_cost]}>Cost</Text>
            {vatRegistered && <Text style={[styles.tableHeaderText, styles.col_vat]}>VAT</Text>}
            <Text style={[styles.tableHeaderText, styles.col_amount]}>Amount</Text>
          </View>
          {items.map((item, i) => {
            const vat = (item.cost * item.vat_rate) / 100
            const amount = item.cost + vat
            return (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.col_desc}>{item.description}</Text>
                <Text style={styles.col_cost}>{fmt(item.cost)}</Text>
                {vatRegistered && (
                  <Text style={styles.col_vat}>
                    {item.vat_rate > 0 ? `${fmt(vat)} (${item.vat_rate}%)` : '—'}
                  </Text>
                )}
                <Text style={styles.col_amount}>{fmt(amount)}</Text>
              </View>
            )
          })}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmt(subtotal)}</Text>
          </View>
          {vatRegistered && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT</Text>
              <Text style={styles.totalValue}>{fmt(vatTotal)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{fmt(total)}</Text>
          </View>
        </View>

        {((settings?.account_name as string | null) || (settings?.sort_code as string | null) || (settings?.account_number as string | null)) && (
          <View style={styles.bankBox}>
            <Text style={styles.bankTitle}>Payment details</Text>
            {([
              (settings?.bank_name as string | null) ? ['Bank', settings!.bank_name as string] : null,
              (settings?.account_name as string | null) ? ['Account name', settings!.account_name as string] : null,
              (settings?.sort_code as string | null) ? ['Sort code', settings!.sort_code as string] : null,
              (settings?.account_number as string | null) ? ['Account no.', settings!.account_number as string] : null,
              (settings?.iban as string | null) ? ['IBAN', settings!.iban as string] : null,
              (settings?.swift as string | null) ? ['SWIFT', settings!.swift as string] : null,
            ] as ([string, string] | null)[]).filter((r): r is [string, string] => r !== null).map(([label, value], i) => (
              <View key={i} style={styles.bankRow}>
                <Text style={[styles.metaLabel, { width: 90 }]}>{label}</Text>
                <Text style={{ fontSize: 10, color: '#111827' }}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {((invoice.notes as string | null) || (settings?.default_notes as string | null)) && (
          <View style={styles.notesBox}>
            <Text style={[styles.bankTitle, { marginBottom: 4 }]}>Notes</Text>
            <Text style={styles.notesText}>{(invoice.notes as string | null) ?? (settings?.default_notes as string | null)}</Text>
          </View>
        )}
      </Page>
    </Document>
  )

  return renderToBuffer(pdfDoc)
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0] // YYYY-MM-DD

  // Fetch invoice settings
  const { data: settings } = await supabase.from('invoice_settings').select('*').single()

  // Find invoices to auto-send:
  // 1. auto_send_at is in the past and not yet sent
  // 2. auto_send_day_of_event is true and event date is today and not yet sent
  const { data: candidates } = await supabase
    .from('invoices')
    .select('*, line_items:invoice_line_items(*), event:events(*, client:clients(*))')
    .is('sent_at', null)
    .order('sort_order', { referencedTable: 'invoice_line_items' })

  const toSend = (candidates ?? []).filter(inv => {
    const event = inv.event as Record<string, unknown> | null
    if (inv.auto_send_at && new Date(inv.auto_send_at) <= now) return true
    if (inv.auto_send_day_of_event && event?.event_date) {
      const eventDay = (event.event_date as string).split('T')[0]
      if (eventDay === todayStr) return true
    }
    return false
  })

  let sent = 0
  let failed = 0

  for (const inv of toSend) {
    const event = inv.event as Record<string, unknown> | null
    const client = (event?.client as Record<string, unknown> | null) ?? null

    // Recipient always comes from the linked client record
    const toEmail = (client?.email as string | null) ?? null

    if (!toEmail) {
      console.warn(`Invoice ${inv.number}: no recipient email, skipping auto-send`)
      continue
    }

    try {
      const pdfBuffer = await buildPdf(inv, settings)

      const eventLabel = event?.agency_name
        ? (event?.agent_name ? `${event.agent_name} at ${event.agency_name}` : event.agency_name as string)
        : (event?.agent_name as string | null) ?? 'your event'

      await sendEmail({
        type: 'invoice',
        to: toEmail,
        subject: `Invoice ${inv.number} — Ward Smith Entertainment`,
        html: `
          <p>Hi,</p>
          <p>Please find your invoice attached for ${eventLabel} on ${formatDate(event?.event_date as string | null)}.</p>
          <p>Total: <strong>${fmt(invoiceTotal(inv.line_items ?? []))}</strong></p>
          ${inv.due_date ? `<p>Due: ${formatDate(inv.due_date)}</p>` : ''}
          <p>Thank you,<br>Ward Smith Entertainment</p>
        `,
      })

      await supabase.from('invoices').update({ sent_at: now.toISOString() }).eq('id', inv.id)
      sent++
    } catch (err) {
      console.error(`Failed to auto-send invoice ${inv.number}:`, err)
      failed++
    }
  }

  return NextResponse.json({ ok: true, sent, failed, checked: toSend.length })
}
