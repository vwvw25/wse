import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { invoiceSubtotal, invoiceVatTotal, invoiceTotal } from '@/types/invoice'
import type { InvoiceLineItem } from '@/types/invoice'
import { FROM_ADDRESS } from '@/lib/send-email'

function getResend() { return new Resend(process.env.RESEND_API_KEY) }

function fmt(n: number) {
  return `£${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function bodyToHtml(body: string): string {
  return body
    .split(/\n\n+/)
    .map(para => `<p style="margin:0 0 12px;line-height:1.6">${para.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

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

async function buildPdfBuffer(
  invoice: Record<string, unknown>,
  settings: Record<string, unknown> | null,
): Promise<Buffer> {
  const event = invoice.event as Record<string, unknown> | null
  const client = (event?.client as Record<string, unknown> | null) ?? null
  const items = (invoice.line_items as InvoiceLineItem[]) ?? []
  const subtotal = invoiceSubtotal(items)
  const vatTotal = invoiceVatTotal(items)
  const total = invoiceTotal(items)
  const vatRegistered = (settings?.vat_registered as boolean) ?? false

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
        {((settings?.account_name as string | null) || (settings?.sort_code as string | null)) && (
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

  return Buffer.from(await renderToBuffer(pdfDoc))
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { to, cc, subject, body } = await req.json() as {
    to: string
    cc: string[]
    subject: string
    body: string
  }

  if (!to) return NextResponse.json({ error: 'Recipient required' }, { status: 400 })

  const supabase = createServiceClient()

  const [{ data: invoice }, { data: settings }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, line_items:invoice_line_items(*), event:events(*, client:clients(*))')
      .eq('id', id)
      .order('sort_order', { referencedTable: 'invoice_line_items' })
      .single(),
    supabase.from('invoice_settings').select('*').single(),
  ])

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const pdfBuffer = await buildPdfBuffer(invoice, settings)
  const html = `<div style="font-family:sans-serif;font-size:14px;color:#111827;max-width:600px">${bodyToHtml(body)}</div>`

  const { data: logRow } = await supabase
    .from('email_logs')
    .insert({ type: 'invoice', recipient_email: to, subject, status: 'pending', html })
    .select('id')
    .single()
  const emailLogId = logRow?.id ?? ''

  try {
    const { data: monRow } = await supabase.from('monitoring_settings').select('reply_to_email').eq('id', 1).single()
    const replyTo = monRow?.reply_to_email ?? undefined

    const result = await getResend().emails.send({
      from: FROM_ADDRESS,
      to,
      ...(cc.length > 0 ? { cc } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      html,
      attachments: [{
        filename: `${invoice.number as string}.pdf`,
        content: pdfBuffer,
      }],
    })

    const resendId = (result.data as { id?: string } | null)?.id ?? null
    await supabase.from('email_logs').update({ status: 'sent', resend_id: resendId, updated_at: new Date().toISOString() }).eq('id', emailLogId)
    await supabase.from('invoices').update({ sent_at: new Date().toISOString() }).eq('id', id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase.from('email_logs').update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() }).eq('id', emailLogId)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
