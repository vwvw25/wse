'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateAgentPrompt, updateAgentConfig, updateAgentBudget, updateInstructionFile, toggleAgentSkill, updateSkillContent } from './actions'

type Agent = {
  id: string
  name: string
  title: string | null
  role: string
  slug: string
  status: string
  monthly_budget_usd: number
  budget_alert_pct: number
  system_prompt: string | null
  reports_to: string | null
  capabilities: string | null
  adapter_type: string | null
  instruction_files: Record<string, string> | null
  created_at: string
}

type AgentRun = {
  id: string
  agent_id: string
  trigger: string
  input_summary: string | null
  output_summary: string | null
  tokens_in: number
  tokens_out: number
  cost_usd: number
  issues_touched: string[] | null
  duration_ms: number | null
  model: string | null
  transcript: string | null
  status: string | null
  created_at: string
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const INSTRUCTION_FILES = ['AGENTS.md', 'HEARTBEAT.md', 'SOUL.md', 'TOOLS.md']

type Skill = {
  id: string
  name: string
  slug: string
  description: string | null
  content: string | null
  created_at: string
}

type Tab = 'dashboard' | 'instructions' | 'skills' | 'configuration' | 'runs' | 'budget'

// ── Run detail panel ──────────────────────────────────────────────────────────
function RunDetail({ run }: { run: AgentRun }) {
  const [transcriptMode, setTranscriptMode] = useState<'nice' | 'raw'>('nice')
  const endTime = run.duration_ms ? new Date(new Date(run.created_at).getTime() + run.duration_ms) : null
  const succeeded = run.status !== 'failed'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status + model */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 5,
          background: succeeded ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
          color: succeeded ? '#34d399' : '#f87171',
          border: `0.5px solid ${succeeded ? '#34d399' : '#f87171'}`,
        }}>{succeeded ? 'succeeded' : 'failed'}</span>
        {run.model && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
            anthropic/{run.model}
          </span>
        )}
      </div>

      {/* Timing */}
      <div style={{ padding: '12px 14px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'monospace' }}>
            {formatTime(run.created_at)}{endTime ? ` → ${formatTime(endTime.toISOString())}` : ''}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {timeAgo(run.created_at)}{run.duration_ms ? ` · Duration: ${(run.duration_ms / 1000).toFixed(1)}s` : ''}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input</div>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{run.tokens_in}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output</div>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{run.tokens_out}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost</div>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>${(run.cost_usd ?? 0).toFixed(4)}</div>
          </div>
        </div>
      </div>

      {/* Issues touched */}
      {(run.issues_touched?.length ?? 0) > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            Issues Touched ({run.issues_touched!.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {run.issues_touched!.map(id => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '0.5px solid #34d399' }}>triage</span>
                <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'monospace' }}>{id.slice(0, 8)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invocation */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Invocation</div>
        <div style={{ padding: '10px 14px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Trigger</div>
          <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'monospace' }}>{run.trigger}</div>
          {run.input_summary && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 10, marginBottom: 4 }}>Input</div>
              <div style={{ fontSize: 12, color: 'var(--text)' }}>{run.input_summary}</div>
            </>
          )}
        </div>
      </div>

      {/* Transcript */}
      {run.transcript && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Transcript</div>
            <div style={{ display: 'flex', gap: 2 }}>
              {(['nice', 'raw'] as const).map(m => (
                <button key={m} onClick={() => setTranscriptMode(m)} style={{
                  padding: '3px 10px', borderRadius: 4, fontSize: 11,
                  border: '0.5px solid var(--border)', cursor: 'pointer',
                  background: transcriptMode === m ? 'var(--text)' : 'transparent',
                  color: transcriptMode === m ? 'var(--bg)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font)',
                }}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>
              ))}
            </div>
          </div>
          <div style={{
            padding: '12px 14px', borderRadius: 8, border: '0.5px solid var(--border)',
            background: 'var(--bg-secondary)', fontSize: 12, lineHeight: 1.7,
            color: 'var(--text)', fontFamily: transcriptMode === 'raw' ? 'monospace' : 'var(--font)',
            whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto',
          }}>
            {run.transcript}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AgentClient({ agent, runs, skills, enabledSkillIds }: {
  agent: Agent
  runs: AgentRun[]
  skills: Skill[]
  enabledSkillIds: string[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [selectedRunId, setSelectedRunId] = useState<string | null>(runs[0]?.id ?? null)

  // Instructions state
  const files = agent.instruction_files ?? {}
  const [selectedFile, setSelectedFile] = useState(INSTRUCTION_FILES[0])
  const [fileContents, setFileContents] = useState<Record<string, string>>(
    Object.fromEntries(INSTRUCTION_FILES.map(f => [f, files[f] ?? '']))
  )
  const [savingFile, setSavingFile] = useState(false)

  // Skills state
  const [enabledSkills, setEnabledSkills] = useState<Set<string>>(new Set(enabledSkillIds))
  const [viewingSkill, setViewingSkill] = useState<Skill | null>(null)
  const [skillContent, setSkillContent] = useState('')
  const [savingSkill, setSavingSkill] = useState(false)

  // Config state
  const [configName, setConfigName] = useState(agent.name)
  const [configTitle, setConfigTitle] = useState(agent.title ?? '')
  const [configReportsTo, setConfigReportsTo] = useState(agent.reports_to ?? '')
  const [configCapabilities, setConfigCapabilities] = useState(agent.capabilities ?? '')
  const [configAdapter, setConfigAdapter] = useState(agent.adapter_type ?? 'claude-haiku-4-5-20251001')
  const [savingConfig, setSavingConfig] = useState(false)

  // Budget state
  const [budgetInput, setBudgetInput] = useState(agent.monthly_budget_usd?.toString() ?? '15')
  const [savingBudget, setSavingBudget] = useState(false)
  const [runningHeartbeat, setRunningHeartbeat] = useState(false)

  async function runHeartbeat() {
    setRunningHeartbeat(true)
    try {
      const res = await fetch(`/api/agents/ceo`, { method: 'POST' })
      const data = await res.json()
      if (data.ok) { setTab('runs'); router.refresh() }
    } finally {
      setRunningHeartbeat(false)
    }
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthRuns = runs.filter(r => new Date(r.created_at) >= monthStart)
  const monthSpend = monthRuns.reduce((s, r) => s + (r.cost_usd ?? 0), 0)
  const budget = agent.monthly_budget_usd ?? 15
  const budgetPct = Math.min((monthSpend / budget) * 100, 100)
  const lastRun = runs[0]
  const selectedRun = runs.find(r => r.id === selectedRunId) ?? null

  async function saveFile() {
    setSavingFile(true)
    await updateInstructionFile(agent.id, selectedFile, fileContents[selectedFile])
    setSavingFile(false)
    router.refresh()
  }

  async function saveConfig() {
    setSavingConfig(true)
    await updateAgentConfig(agent.id, {
      name: configName, title: configTitle,
      reports_to: configReportsTo, capabilities: configCapabilities,
      adapter_type: configAdapter,
    })
    setSavingConfig(false)
    router.refresh()
  }

  async function saveBudget() {
    setSavingBudget(true)
    await updateAgentBudget(agent.id, parseFloat(budgetInput))
    setSavingBudget(false)
    router.refresh()
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'instructions', label: 'Instructions' },
    { key: 'skills', label: 'Skills' },
    { key: 'configuration', label: 'Configuration' },
    { key: 'runs', label: 'Runs' },
    { key: 'budget', label: 'Budget' },
  ]

  return (
    <div style={{ fontFamily: 'var(--font)', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px 0', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 9, flexShrink: 0,
            background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="5.5" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M7 5.5V4.5a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="10" cy="11.5" r="1.8" fill="currentColor"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{agent.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{agent.title ?? agent.role}</div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 6, fontSize: 12,
              border: '0.5px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)',
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Assign Task
            </button>
            <button onClick={runHeartbeat} disabled={runningHeartbeat} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 6, fontSize: 12,
              border: '0.5px solid var(--border)', background: 'transparent',
              color: runningHeartbeat ? 'var(--text-tertiary)' : 'var(--text-secondary)',
              cursor: runningHeartbeat ? 'default' : 'pointer', fontFamily: 'var(--font)',
              opacity: runningHeartbeat ? 0.6 : 1,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 2l7 4-7 4V2z" fill="currentColor"/></svg>
              {runningHeartbeat ? 'Running…' : 'Run Heartbeat'}
            </button>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 6, fontSize: 12,
              border: '0.5px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)',
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="2" width="3" height="8" rx="0.5" fill="currentColor"/><rect x="7" y="2" width="3" height="8" rx="0.5" fill="currentColor"/></svg>
              Pause
            </button>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 5,
              background: agent.status === 'active' ? 'rgba(234,179,8,0.15)' : 'var(--bg-secondary)',
              color: agent.status === 'active' ? '#eab308' : 'var(--text-tertiary)',
              border: `0.5px solid ${agent.status === 'active' ? '#eab308' : 'var(--border)'}`,
            }}>idle</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '7px 16px', border: 'none', background: 'transparent',
              fontSize: 13, fontFamily: 'var(--font)', cursor: 'pointer',
              color: tab === t.key ? 'var(--text)' : 'var(--text-secondary)',
              borderBottom: tab === t.key ? '2px solid var(--text)' : '2px solid transparent',
              fontWeight: tab === t.key ? 500 : 400, marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ── Dashboard ─────────────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div style={{ padding: '28px 32px', maxWidth: 860 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Runs this month', value: monthRuns.length.toString() },
              { label: 'Spend this month', value: `$${monthSpend.toFixed(4)}` },
              { label: 'Last active', value: lastRun ? timeAgo(lastRun.created_at) : 'Never' },
            ].map(stat => (
              <div key={stat.label} style={{ padding: '16px 18px', borderRadius: 8, border: '0.5px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{stat.value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Recent runs</div>
          {runs.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '24px 0' }}>No runs yet</div>
          ) : runs.slice(0, 8).map(run => (
            <div key={run.id} onClick={() => { setSelectedRunId(run.id); setTab('runs') }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: run.status === 'failed' ? '#f87171' : '#34d399', flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{run.output_summary ?? 'Run completed'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {run.trigger} · {run.tokens_in + run.tokens_out} tok · ${(run.cost_usd ?? 0).toFixed(4)}
                </div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{timeAgo(run.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Instructions ──────────────────────────────────────────────────────── */}
      {tab === 'instructions' && (
        <div style={{ display: 'flex', height: 'calc(100vh - 150px)' }}>
          {/* File list */}
          <div style={{ width: 220, flexShrink: 0, borderRight: '0.5px solid var(--border)', padding: '16px 0' }}>
            <div style={{ padding: '0 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Files</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>+</button>
            </div>
            {INSTRUCTION_FILES.map(f => {
              const size = fileContents[f]?.length ?? 0
              const isEntry = f === 'AGENTS.md'
              return (
                <button key={f} onClick={() => setSelectedFile(f)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '7px 16px', border: 'none',
                  background: selectedFile === f ? 'var(--bg-secondary)' : 'transparent',
                  cursor: 'pointer', fontFamily: 'var(--font)',
                  borderLeft: selectedFile === f ? '2px solid var(--text)' : '2px solid transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 1.5h6l3 3v7a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5v-10A.5.5 0 0 1 2 1.5z" stroke="currentColor" strokeWidth="1.1"/><path d="M8 1.5v3h3" stroke="currentColor" strokeWidth="1.1"/></svg>
                    <span style={{ fontSize: 12, color: selectedFile === f ? 'var(--text)' : 'var(--text-secondary)' }}>{f}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isEntry && (
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '0.5px solid var(--border)' }}>ENTRY</span>
                    )}
                    {size > 0 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{size}B</span>}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{selectedFile}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>markdown file</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setFileContents(f => ({ ...f, [selectedFile]: agent.instruction_files?.[selectedFile] ?? '' }))}
                  style={{ padding: '4px 12px', borderRadius: 5, fontSize: 12, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Cancel
                </button>
                <button onClick={saveFile} disabled={savingFile} style={{
                  padding: '4px 14px', borderRadius: 5, fontSize: 12,
                  background: savingFile ? 'var(--bg-secondary)' : 'var(--text)',
                  color: savingFile ? 'var(--text-tertiary)' : 'var(--bg)',
                  border: 'none', cursor: savingFile ? 'default' : 'pointer',
                  fontFamily: 'var(--font)', fontWeight: 500,
                }}>{savingFile ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
            <textarea
              value={fileContents[selectedFile] ?? ''}
              onChange={e => setFileContents(f => ({ ...f, [selectedFile]: e.target.value }))}
              placeholder={`Enter ${selectedFile} content...`}
              style={{
                flex: 1, width: '100%', fontSize: 13, lineHeight: 1.7,
                fontFamily: 'var(--font-mono, monospace)',
                border: 'none', padding: '20px 24px',
                background: 'transparent', color: 'var(--text)',
                outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Skills ────────────────────────────────────────────────────────────── */}
      {tab === 'skills' && (
        <div style={{ display: 'flex', height: 'calc(100vh - 150px)' }}>
          {/* Skill list */}
          <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', maxWidth: viewingSkill ? 480 : undefined }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>View company skills library</div>
            <div style={{ border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: 'var(--bg-secondary)', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', borderBottom: '0.5px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                WSE Skills Library
              </div>
              {skills.map((skill, i) => (
                <div key={skill.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < skills.length - 1 ? '0.5px solid var(--border)' : 'none',
                  background: viewingSkill?.id === skill.id ? 'var(--bg-secondary)' : 'transparent',
                }}>
                  <input
                    type="checkbox"
                    checked={enabledSkills.has(skill.id)}
                    onChange={async e => {
                      const checked = e.target.checked
                      setEnabledSkills(prev => {
                        const next = new Set(prev)
                        checked ? next.add(skill.id) : next.delete(skill.id)
                        return next
                      })
                      await toggleAgentSkill(agent.id, skill.id, checked)
                    }}
                    style={{ width: 14, height: 14, accentColor: 'var(--accent)', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>{skill.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {skill.description ?? 'Will be bundled into the agent prompt on the next run.'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setViewingSkill(skill)
                      setSkillContent(skill.content ?? '')
                    }}
                    style={{
                      fontSize: 12, color: viewingSkill?.id === skill.id ? 'var(--text)' : 'var(--text-secondary)',
                      background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                      fontWeight: viewingSkill?.id === skill.id ? 500 : 400,
                    }}>View</button>
                </div>
              ))}
            </div>
          </div>

          {/* Skill editor */}
          {viewingSkill && (
            <div style={{ width: 480, flexShrink: 0, borderLeft: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{viewingSkill.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{viewingSkill.slug}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => setViewingSkill(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
                  <button
                    onClick={async () => {
                      setSavingSkill(true)
                      await updateSkillContent(viewingSkill.id, skillContent)
                      setSavingSkill(false)
                      router.refresh()
                    }}
                    disabled={savingSkill}
                    style={{
                      padding: '4px 14px', borderRadius: 5, fontSize: 12,
                      background: savingSkill ? 'var(--bg-secondary)' : 'var(--text)',
                      color: savingSkill ? 'var(--text-tertiary)' : 'var(--bg)',
                      border: 'none', cursor: savingSkill ? 'default' : 'pointer',
                      fontFamily: 'var(--font)', fontWeight: 500,
                    }}>{savingSkill ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
              <textarea
                value={skillContent}
                onChange={e => setSkillContent(e.target.value)}
                placeholder={`Describe what the ${viewingSkill.name} skill does and how the agent should use it...`}
                style={{
                  flex: 1, width: '100%', fontSize: 13, lineHeight: 1.7,
                  fontFamily: 'var(--font-mono, monospace)',
                  border: 'none', padding: '20px', background: 'transparent',
                  color: 'var(--text)', outline: 'none', resize: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Configuration ─────────────────────────────────────────────────────── */}
      {tab === 'configuration' && (
        <div style={{ padding: '28px 32px', maxWidth: 640 }}>
          {/* Identity */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Identity</div>
            <div style={{ border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {[
                { label: 'Name', value: configName, setter: setConfigName, placeholder: 'Agent name' },
                { label: 'Title', value: configTitle, setter: setConfigTitle, placeholder: 'e.g. Chief of Staff' },
                { label: 'Reports to', value: configReportsTo, setter: setConfigReportsTo, placeholder: 'e.g. Victoria' },
              ].map(({ label, value, setter, placeholder }, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', borderBottom: i < 2 ? '0.5px solid var(--border)' : 'none', padding: '10px 16px', gap: 12 }}>
                  <label style={{ fontSize: 13, color: 'var(--text-secondary)', width: 100, flexShrink: 0 }}>{label}</label>
                  <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                    style={{ flex: 1, fontSize: 13, background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)' }} />
                </div>
              ))}
              <div style={{ borderTop: '0.5px solid var(--border)', padding: '10px 16px' }}>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Capabilities</label>
                <textarea value={configCapabilities} onChange={e => setConfigCapabilities(e.target.value)}
                  placeholder="Describe what this agent can do..."
                  rows={3} style={{ width: '100%', fontSize: 13, background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          {/* Adapter */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Adapter</div>
              <button style={{ padding: '4px 12px', borderRadius: 5, fontSize: 12, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Test</button>
            </div>
            <div style={{ border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 16px' }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Adapter type</label>
              <select value={configAdapter} onChange={e => setConfigAdapter(e.target.value)}
                style={{ width: '100%', fontSize: 13, background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '6px 10px', fontFamily: 'var(--font)', outline: 'none' }}>
                <option value="claude-haiku-4-5-20251001">Claude Haiku (fast, cheap)</option>
                <option value="claude-sonnet-4-6">Claude Sonnet (balanced)</option>
                <option value="claude-opus-4-8">Claude Opus (most capable)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={saveConfig} disabled={savingConfig} style={{
              padding: '6px 18px', borderRadius: 6, fontSize: 13,
              background: savingConfig ? 'var(--bg-secondary)' : 'var(--text)',
              color: savingConfig ? 'var(--text-tertiary)' : 'var(--bg)',
              border: 'none', cursor: savingConfig ? 'default' : 'pointer',
              fontFamily: 'var(--font)', fontWeight: 500,
            }}>{savingConfig ? 'Saving…' : 'Save configuration'}</button>
          </div>
        </div>
      )}

      {/* ── Runs ──────────────────────────────────────────────────────────────── */}
      {tab === 'runs' && (
        <div style={{ display: 'flex', height: 'calc(100vh - 150px)' }}>
          {/* Run list */}
          <div style={{ width: 300, flexShrink: 0, borderRight: '0.5px solid var(--border)', overflowY: 'auto' }}>
            {runs.length === 0 ? (
              <div style={{ padding: '32px 16px', fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>No runs yet</div>
            ) : runs.map(run => {
              const isSelected = run.id === selectedRunId
              return (
                <button key={run.id} onClick={() => setSelectedRunId(run.id)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px 16px', border: 'none',
                  borderBottom: '0.5px solid var(--border)',
                  borderLeft: isSelected ? '2px solid var(--text)' : '2px solid transparent',
                  background: isSelected ? 'var(--bg-secondary)' : 'transparent',
                  cursor: 'pointer', fontFamily: 'var(--font)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{run.id.slice(0, 8)}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
                      background: run.trigger === 'email' ? 'rgba(99,102,241,0.12)' : 'rgba(234,179,8,0.12)',
                      color: run.trigger === 'email' ? '#818cf8' : '#eab308',
                      border: `0.5px solid ${run.trigger === 'email' ? '#818cf8' : '#eab308'}`,
                      textTransform: 'capitalize',
                    }}>{run.trigger}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{timeAgo(run.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {run.output_summary ?? 'Run completed'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {run.tokens_in + run.tokens_out} tok · ${(run.cost_usd ?? 0).toFixed(4)}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Run detail */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {selectedRun ? (
              <RunDetail run={selectedRun} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 13, color: 'var(--text-tertiary)' }}>
                Select a run to view details
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Budget ────────────────────────────────────────────────────────────── */}
      {tab === 'budget' && (
        <div style={{ padding: '28px 32px', maxWidth: 560 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Agent</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{agent.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Monthly UTC budget</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
              background: 'rgba(52,211,153,0.1)', color: '#34d399',
              border: '0.5px solid #34d399',
            }}>HEALTHY</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Observed</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>${monthSpend.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{budgetPct.toFixed(2)}% of limit</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Budget</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>${budget.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Soft alert at {agent.budget_alert_pct}%</div>
            </div>
          </div>

          <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Remaining</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>${Math.max(budget - monthSpend, 0).toFixed(2)}</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, marginBottom: 28 }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${budgetPct}%`, background: budgetPct > 80 ? '#f87171' : '#34d399', transition: 'width 0.3s' }} />
          </div>

          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Budget (USD)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                style={{ flex: 1, fontSize: 14, padding: '8px 12px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)' }}
              />
              <button onClick={saveBudget} disabled={savingBudget} style={{
                padding: '8px 18px', borderRadius: 6, fontSize: 13,
                background: savingBudget ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                color: savingBudget ? 'var(--text-tertiary)' : 'var(--text)',
                border: '0.5px solid var(--border)', cursor: savingBudget ? 'default' : 'pointer',
                fontFamily: 'var(--font)', fontWeight: 500,
              }}>{savingBudget ? 'Saving…' : 'Update budget'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
