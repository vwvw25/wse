import { createServiceClient } from '@/lib/supabase'
import NotificationsClient from './NotificationsClient'

export default async function NotificationsPage() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div>
      <div style={{ padding: '32px 32px 0', maxWidth: 800 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Notifications</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>System alerts and email delivery issues.</p>
      </div>
      <NotificationsClient notifications={data ?? []} />
    </div>
  )
}
