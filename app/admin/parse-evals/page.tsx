import { createServiceClient } from '@/lib/supabase'
import ParseEvalsClient from './ParseEvalsClient'

export default async function ParseEvalsPage() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('email_parse_evals')
    .select('*, events(agency_name, agent_name, event_date)')
    .order('created_at', { ascending: false })

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Parse evals</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Review how emails were parsed. Highlighted fields were corrected before saving.
        </p>
      </div>
      <ParseEvalsClient evals={data ?? []} />
    </div>
  )
}
