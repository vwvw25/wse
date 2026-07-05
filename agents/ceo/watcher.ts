import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const envFile = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8')
function getEnv(key: string) {
  const match = envFile.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match?.[1]?.trim() ?? ''
}

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

const RUN_SCRIPT = path.join(__dirname, 'run.sh')
let running = false

function triggerCEO(reason: string) {
  if (running) {
    console.log(`[watcher] CEO already running, skipping trigger: ${reason}`)
    return
  }
  running = true
  console.log(`[watcher] Triggering CEO: ${reason}`)
  try {
    execSync(`bash "${RUN_SCRIPT}"`, { stdio: 'inherit' })
  } catch (err) {
    console.error('[watcher] CEO run failed:', err)
  } finally {
    running = false
  }
}

console.log('[watcher] Starting — watching gmail_inbox and agent_proposals...')

supabase
  .channel('ceo-triggers')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gmail_inbox' }, payload => {
    triggerCEO(`new email: ${(payload.new as any).subject ?? payload.new.id}`)
  })
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agent_proposals' }, payload => {
    const p = payload.new as any
    if (p.status === 'approved' || p.status === 'declined') {
      triggerCEO(`proposal ${p.status}: ${p.id}`)
    }
  })
  .subscribe(status => {
    console.log('[watcher] Realtime status:', status)
    if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      console.log('[watcher] Connection lost — exiting for launchd restart')
      process.exit(1)
    }
  })
