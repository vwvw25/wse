import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const envFile = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8')
function getEnv(key: string) {
  const match = envFile.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match?.[1]?.trim() ?? ''
}

const ACCOUNTS_AGENT_ID = 'a48c0f24-f4c9-4e07-ba0f-ae14b21057bd'
const RUN_SCRIPT = path.join(__dirname, 'run.sh')
let running = false

function triggerAccounts(reason: string) {
  if (running) {
    console.log(`[watcher] Accounts already running, skipping trigger: ${reason}`)
    return
  }
  running = true
  console.log(`[watcher] Triggering Accounts: ${reason}`)
  try {
    execSync(`bash "${RUN_SCRIPT}"`, { stdio: 'inherit' })
  } catch (err) {
    console.error('[watcher] Accounts run failed:', err)
  } finally {
    running = false
  }
}

function connect() {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

  console.log('[watcher] Connecting to Supabase realtime...')

  const channel = supabase
    .channel('accounts-triggers')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'issues' }, payload => {
      const p = payload.new as any
      const old = payload.old as any
      // Only trigger when assigned_agent_id is newly set to accounts — not on every update the agent itself makes
      if (p.assigned_agent_id === ACCOUNTS_AGENT_ID && old.assigned_agent_id !== ACCOUNTS_AGENT_ID) {
        triggerAccounts(`issue assigned to accounts: ${p.id}`)
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'issues' }, payload => {
      const p = payload.new as any
      if (p.assigned_agent_id === ACCOUNTS_AGENT_ID) {
        triggerAccounts(`new issue assigned to accounts: ${p.id}`)
      }
    })
    .subscribe(status => {
      console.log('[watcher] Realtime status:', status)
      if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        console.log('[watcher] Connection lost — exiting for launchd restart')
        process.exit(1)
      }
    })
}

connect()
