import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { invoiceSubtotal, invoiceVatTotal, invoiceTotal } from '@/types/invoice'
import type { InvoiceLineItem } from '@/types/invoice'

function fmt(n: number) {
  return `£${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const event = invoice.event
  const client = event?.client
  const items: InvoiceLineItem[] = invoice.line_items ?? []
  const subtotal = invoiceSubtotal(items)
  const vatTotal = invoiceVatTotal(items)
  const total = invoiceTotal(items)
  const vatRegistered = settings?.vat_registered ?? false

  // Bill-to always comes from the linked client record
  const billToName = client?.name ?? 'Client'
  const billToEmail = client?.email ?? null
  const billToAddress = client?.address ?? null

  const statusColor = invoice.status === 'paid' ? '#16a34a' : '#d97706'
  const statusBg = invoice.status === 'paid' ? '#f0fdf4' : '#fffbeb'

  const pdfDoc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {settings?.logo_url
              ? <Image src={settings.logo_url} style={styles.logo} />
              : <Text style={styles.companyName}>Ward Smith Entertainment</Text>
            }
            {settings?.business_address && settings.business_address.split('\n').map((line: string, i: number) => (
              <Text key={i} style={{ fontSize: 9, color: '#6b7280', lineHeight: 1.5 }}>{line}</Text>
            ))}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={{ fontSize: 11, color: '#6b7280' }}>{invoice.number}</Text>
          </View>
        </View>

        {/* Status badge */}
        <View style={[styles.badge, { backgroundColor: statusBg }]}>
          <Text style={{ color: statusColor, fontFamily: 'Helvetica-Bold', fontSize: 9 }}>
            {invoice.status === 'paid' ? '✓ Paid' : 'Outstanding'}
          </Text>
        </View>

        {/* Bill to / invoice meta */}
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.metaLabel, { marginBottom: 6 }]}>Bill to</Text>
            <Text style={[styles.addressBlock, { fontFamily: 'Helvetica-Bold' }]}>{billToName}</Text>
            {billToEmail && <Text style={styles.addressBlock}>{billToEmail}</Text>}
            {billToAddress && billToAddress.split('\n').map((line: string, i: number) => (
              <Text key={i} style={styles.addressBlock}>{line}</Text>
            ))}
          </View>
          <View style={{ width: 180 }}>
            {([
              ['Invoice number', invoice.number],
              ['Issue date', formatDate(invoice.issue_date)],
              ['Due date', formatDate(invoice.due_date)],
              invoice.po_number ? ['PO number', invoice.po_number] : null,
              ['Event date', formatDate(event?.event_date ?? null)],
              event?.venue_name ? ['Venue', event.venue_name] : null,
            ] as ([string, string] | null)[]).filter((r): r is [string, string] => r !== null).map(([label, value], i) => (
              <View key={i} style={styles.metaRow}>
                <Text style={styles.metaLabel}>{label}</Text>
                <Text style={styles.metaValue}>{value}</Text>
              </View>
            ))}
            {vatRegistered && settings?.vat_number && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>VAT no.</Text>
                <Text style={styles.metaValue}>{settings.vat_number}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line items */}
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
                <Text style={[styles.col_desc]}>{item.description}</Text>
                <Text style={[styles.col_cost]}>{fmt(item.cost)}</Text>
                {vatRegistered && (
                  <Text style={[styles.col_vat]}>
                    {item.vat_rate > 0 ? `${fmt(vat)} (${item.vat_rate}%)` : '—'}
                  </Text>
                )}
                <Text style={[styles.col_amount]}>{fmt(amount)}</Text>
              </View>
            )
          })}
        </View>

        {/* Totals */}
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

        {/* Bank details */}
        {(settings?.account_name || settings?.sort_code || settings?.account_number) && (
          <View style={styles.bankBox}>
            <Text style={styles.bankTitle}>Payment details</Text>
            {([
              settings?.bank_name ? ['Bank', settings.bank_name] : null,
              settings?.account_name ? ['Account name', settings.account_name] : null,
              settings?.sort_code ? ['Sort code', settings.sort_code] : null,
              settings?.account_number ? ['Account no.', settings.account_number] : null,
              settings?.iban ? ['IBAN', settings.iban] : null,
              settings?.swift ? ['SWIFT', settings.swift] : null,
            ] as ([string, string] | null)[]).filter((r): r is [string, string] => r !== null).map(([label, value], i) => (
              <View key={i} style={styles.bankRow}>
                <Text style={[styles.metaLabel, { width: 90 }]}>{label}</Text>
                <Text style={{ fontSize: 10, color: '#111827' }}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {(invoice.notes || settings?.default_notes) && (
          <View style={styles.notesBox}>
            <Text style={[styles.bankTitle, { marginBottom: 4 }]}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes ?? settings?.default_notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(pdfDoc)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
    },
  })
}
