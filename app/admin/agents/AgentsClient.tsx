'use client'

import Link from 'next/link'

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

type Agent = {
  id: string
  name: string
  role: string
  slug: string
  status: string
  monthly_budget_usd: number
}

export default function AgentsClient({
  agents,
  lastRun,
  monthSpend,
}: {
  agents: Agent[]
  lastRun: Record<string, string>
  monthSpend: Record<string, number>
}) {
  return (
    <div style={{ padding: '32px', fontFamily: 'var(--font)', maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Agents</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>AI agents running your business operations</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {agents.map(agent => {
          const spend = monthSpend[agent.id] ?? 0
          const budget = agent.monthly_budget_usd ?? 15
          const pct = Math.min((spend / budget) * 100, 100)

          return (
            <Link key={agent.id} href={`/admin/agents/${agent.slug}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 18px', borderRadius: 8,
                  border: '0.5px solid var(--border)',
                  background: 'var(--bg)',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                  background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)',
                }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2" y="5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M6 5V4a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
                  </svg>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{agent.role}</div>
                </div>

                <div style={{ width: 120, flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>${spend.toFixed(2)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>${budget.toFixed(0)}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--bg-secondary)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${pct}%`,
                      background: pct > 80 ? '#f87171' : '#34d399',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
                    background: agent.status === 'active' ? 'rgba(52,211,153,0.1)' : 'var(--bg-secondary)',
                    color: agent.status === 'active' ? '#34d399' : 'var(--text-tertiary)',
                    border: `0.5px solid ${agent.status === 'active' ? '#34d399' : 'var(--border)'}`,
                  }}>{agent.status}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 60, textAlign: 'right' }}>
                    {lastRun[agent.id] ? timeAgo(lastRun[agent.id]) : 'Never run'}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
