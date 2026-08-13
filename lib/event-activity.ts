import { createServiceClient } from '@/lib/supabase'

export type EventActivityType =
  | 'field_change'
  | 'status_change'
  | 'musician_change'
  | 'quote_change'
  | 'invoice_change'
  | 'request_change'
  | 'set_list_change'
  | 'contract_change'
  | 'ai_agent_action'
  | 'comment'

export const COMMENT_CATEGORIES = [
  { value: 'av', label: 'AV' },
  { value: 'timings', label: 'Timings' },
  { value: 'set_list_repertoire', label: 'Set List & Repertoire' },
  { value: 'id_security', label: 'ID & Security' },
  { value: 'parking_load', label: 'Parking & Load In/Out' },
  { value: 'dress_code', label: 'Dress Code' },
  { value: 'food_drink', label: 'Food & Drink' },
  { value: 'contact_info', label: 'Contact Information' },
  { value: 'invoicing', label: 'Invoicing' },
  { value: 'accommodation_travel', label: 'Accommodation & Travel' },
  { value: 'general', label: 'General' },
] as const

export type CommentCategory = typeof COMMENT_CATEGORIES[number]['value']

export async function logEventActivity(
  eventId: string,
  opts: {
    type: EventActivityType
    summary?: string
    note?: string
    field?: string
    fieldLabel?: string
    oldValue?: string | null
    newValue?: string | null
    source?: string
    actor?: string
    category?: string
  },
) {
  const supabase = createServiceClient()
  await supabase.from('event_activity_log').insert({
    event_id: eventId,
    type: opts.type,
    summary: opts.summary ?? null,
    note: opts.note ?? null,
    field: opts.field ?? null,
    field_label: opts.fieldLabel ?? opts.field ?? null,
    old_value: opts.oldValue ?? null,
    new_value: opts.newValue ?? null,
    source: opts.source ?? 'app',
    actor: opts.actor ?? 'admin',
    category: opts.category ?? null,
  })
}
