import { createServiceClient } from '@/lib/supabase'
import EmailLogsClient from './EmailLogsClient'

export default async function EmailLogsPage() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('email_logs')
    .select('id, created_at, updated_at, type, recipient_email, recipient_name, subject, status, error_message, resend_id, alerted_at, html')
    .order('created_at', { ascending: false })
    .limit(500)

  return (
    <div>
      <div style={{ padding: '32px 32px 0', maxWidth: 1100 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Email logs</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          All outbound emails. Anything not showing as delivered may need attention.
        </p>
      </div>
      <EmailLogsClient logs={data ?? []} />
    </div>
  )
}
