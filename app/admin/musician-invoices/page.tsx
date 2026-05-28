import { createServiceClient } from '@/lib/supabase'
import MusicianInvoicesClient from './MusicianInvoicesClient'
import type { MusicianInvoiceRow } from './MusicianInvoicesClient'

export default async function MusicianInvoicesPage() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('event_musicians')
    .select(`
      id, instrument, fee, additional_costs,
      musician_invoice_status, musician_invoice_path, musician_invoice_filename, musician_payment_date,
      event:events(id, event_date, agency_name, agent_name),
      musician:musicians(id, first_name, last_name)
    `)
    .not('musician_id', 'is', null)

  const rows = (data ?? []) as unknown as MusicianInvoiceRow[]

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)', maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Musician invoices</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          All booked musician slots — track invoice receipt and payment.
        </p>
      </div>
      <MusicianInvoicesClient rows={rows} />
    </div>
  )
}
