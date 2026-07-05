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
  })
}
