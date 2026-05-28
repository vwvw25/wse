export type ClientType = 'direct' | 'agency' | 'event_planner'

export interface Client {
  id: string
  name: string
  client_type: ClientType
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export interface InvoiceSettings {
  id: string
  vat_registered: boolean
  vat_number: string | null
  bank_name: string | null
  account_name: string | null
  sort_code: string | null
  account_number: string | null
  iban: string | null
  swift: string | null
  logo_url: string | null
  default_notes: string | null
  year_counters: Record<string, number>
  invoice_email_subject: string | null
  invoice_email_body: string | null
  account_owner_email: string | null
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  cost: number
  vat_rate: number
  sort_order: number
}

export type InvoiceStatus = 'outstanding' | 'paid'

export interface Invoice {
  id: string
  event_id: string
  number: string
  year: number
  sequence: number
  status: InvoiceStatus
  sent_at: string | null
  auto_send_at: string | null
  auto_send_day_of_event: boolean
  issue_date: string | null
  due_date: string | null
  notes: string | null
  po_number: string | null
  created_at: string
  line_items?: InvoiceLineItem[]
}

export function invoiceSubtotal(items: InvoiceLineItem[]): number {
  return items.reduce((sum, i) => sum + i.cost, 0)
}

export function invoiceVatTotal(items: InvoiceLineItem[]): number {
  return items.reduce((sum, i) => sum + (i.cost * i.vat_rate) / 100, 0)
}

export function invoiceTotal(items: InvoiceLineItem[]): number {
  return invoiceSubtotal(items) + invoiceVatTotal(items)
}
