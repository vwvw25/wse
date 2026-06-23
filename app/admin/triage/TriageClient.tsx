'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Issue } from '../issues/IssuesClient'
import { StatusCircle, STATUSES, STATUS_LABELS, LABELS, LABEL_DISPLAY } from '../issues/IssuesClient'
import { updateIssue, createIssue } from '../issues/actions'
import { acceptTriageIssue, moveToNotAnIssue } from './actions'

function issueId(issue: Issue) {
  return issue.number ? `WSE-${issue.number}` : `WSE-${issue.id.slice(0, 4).toUpperCase()}`
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

// Property pill for the detail top bar
function PropPill({ label, icon, onClick }: { label: string; icon?: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 6, fontSize: 12,
      border: '0.5px solid var(--border)', background: 'transparent',
      color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)',
      whiteSpace: 'nowrap',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}{label}
    </button>
  )
}

// Action button (Accept / Decline / etc)
function ActionBtn({ label, icon, onClick, variant = 'default' }: {
  label: string; icon?: React.ReactNode; onClick: () => void; variant?: 'default' | 'accept' | 'decline'
}) {
  const colors = {
    default: { bg: 'transparent', color: 'var(--text-secondary)', border: 'var(--border)' },
    accept: { bg: 'transparent', color: '#34d399', border: '#34d399' },
    decline: { bg: 'transparent', color: '#f87171', border: '#f87171' },
  }
  const c = colors[variant]
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 11px', borderRadius: 6, fontSize: 12,
      border: `0.5px solid ${c.border}`, background: c.bg,
      color: c.color, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {icon}{label}
    </button>
  )
}

function NewIssueModal({ onClose, pmEvents }: { onClose: () => void; pmEvents: { id: string; name: string }[] }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('')
  const [label, setLabel] = useState('')
  const [createMore, setCreateMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    if (!title.trim() || saving) return
    setSaving(true)
    await createIssue({ title: title.trim(), description: description || null, status: 'triage', priority: priority || null, label: label || null, source: 'manual' })
    router.refresh()
    if (createMore) { setTitle(''); setDescription(''); setSaving(false) }
    else onClose()
  }

  const pill = (active = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 10px', borderRadius: 6, fontSize: 12,
    border: `0.5px solid ${active ? 'var(--border-hover)' : 'var(--border)'}`,
    background: 'transparent', color: 'var(--text-secondary)',
    cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg)', borderRadius: 10,
        border: '0.5px solid var(--border)', width: 640, maxWidth: '95vw',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderBottom: '0.5px solid var(--border)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: '#16a34a', fontSize: 10, fontWeight: 700, color: '#fff' }}>W</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>›</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>New issue</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Save as draft</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px 8px' }}>
          <input autoFocus placeholder="Issue title" value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
            style={{ width: '100%', fontSize: 16, fontWeight: 500, padding: 0, border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)', marginBottom: 10 }}
          />
          <textarea placeholder="Add description..." value={description} onChange={e => setDescription(e.target.value)} rows={4}
            style={{ width: '100%', fontSize: 13.5, padding: 0, border: 'none', background: 'transparent', color: 'var(--text-secondary)', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)' }}
          />
        </div>

        {/* Properties row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderTop: '0.5px solid var(--border)', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ ...pill(true), color: STATUS_LABELS['triage'] ? 'var(--text)' : 'var(--text-secondary)' }}>
            <StatusCircle status="triage" size={12} />
            Triage
          </span>
          <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...pill(!!priority), appearance: 'none' as any }}>
            <option value="">Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button style={pill()}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 11c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            Assignee
          </button>
          <select value={label} onChange={e => setLabel(e.target.value)} style={{ ...pill(!!label), appearance: 'none' as any }}>
            <option value="">Labels</option>
            {LABELS.map(l => <option key={l} value={l}>{LABEL_DISPLAY[l]}</option>)}
          </select>
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: '0.5px solid var(--border)', gap: 8 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 4 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 6.5L6.5 12a3.5 3.5 0 01-4.95-4.95l5.5-5.5a2 2 0 012.83 2.83L4.5 9.5a.5.5 0 01-.71-.71L9 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <button onClick={() => setCreateMore(m => !m)} style={{
                width: 30, height: 17, borderRadius: 9, border: 'none', cursor: 'pointer',
                background: createMore ? '#2563eb' : 'var(--border-hover)',
                position: 'relative', transition: 'background 0.15s', flexShrink: 0,
              }}>
                <span style={{ position: 'absolute', top: 2, width: 13, height: 13, borderRadius: '50%', background: '#fff', transition: 'left 0.15s', left: createMore ? 15 : 2 }} />
              </button>
              Create more
            </label>
            <button type="button" onClick={onClose} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 13, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={!title.trim() || saving} style={{ padding: '5px 14px', borderRadius: 6, fontSize: 13, background: '#2563eb', color: '#fff', border: 'none', cursor: title.trim() && !saving ? 'pointer' : 'default', opacity: title.trim() && !saving ? 1 : 0.5, fontFamily: 'var(--font)', fontWeight: 500 }}>Create issue</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function IssueDetail({ issue, pmEvents, onAction }: {
  issue: Issue & { pm_events?: { id: string; name: string } | null }
  pmEvents: { id: string; name: string }[]
  onAction: (id: string, action: 'accept' | 'not_an_issue' | 'decline') => void
}) {
  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(issue.description ?? '')
  const [, startTransition] = useTransition()
  const router = useRouter()

  function save(fields: Record<string, unknown>) {
    startTransition(async () => { await updateIssue(issue.id, fields); router.refresh() })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top action bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 16px', height: 46, borderBottom: '0.5px solid var(--border)',
        flexShrink: 0, overflowX: 'auto',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{issueId(issue)}</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{issue.title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
          <ActionBtn label="Accept" variant="accept" onClick={() => onAction(issue.id, 'accept')}
            icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          <ActionBtn label="Not an issue" onClick={() => onAction(issue.id, 'not_an_issue')}
            icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v5M6 8.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
          />
          <ActionBtn label="Decline" variant="decline" onClick={() => onAction(issue.id, 'decline')}
            icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
          />
        </div>
      </div>

      {/* Properties strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderBottom: '0.5px solid var(--border)',
        flexShrink: 0, overflowX: 'auto',
      }}>
        <PropPill label="Triage" icon={<StatusCircle status="triage" size={12} />} />
        <PropPill label="Priority" icon={
          <svg width="11" height="11" viewBox="0 0 11 11"><rect x="1" y="6" width="2" height="4" rx="0.5" fill="currentColor" opacity="0.4"/><rect x="4.5" y="3.5" width="2" height="6.5" rx="0.5" fill="currentColor" opacity="0.4"/><rect x="8" y="1" width="2" height="9" rx="0.5" fill="currentColor" opacity="0.4"/></svg>
        } />
        <PropPill label="Assignee" icon={
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 11c0-2.5 2.24-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        } />
        <PropPill label="Event" icon={
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/></svg>
        } />
        <PropPill label={issue.label ? LABEL_DISPLAY[issue.label] : 'Labels'} icon={
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1h4.5l5.5 5.5-4.5 4.5L1 5.5V1z" stroke="currentColor" strokeWidth="1.2"/><circle cx="3.5" cy="3.5" r="0.8" fill="currentColor"/></svg>
        } />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        {/* Title */}
        <textarea value={title} onChange={e => { setTitle(e.target.value); e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px' }}
          onBlur={() => { if (title !== issue.title) save({ title }) }}
          rows={1}
          style={{ width: '100%', fontSize: 22, fontWeight: 600, lineHeight: 1.35, border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'var(--font)', marginBottom: 12, overflow: 'hidden', display: 'block', boxSizing: 'border-box' }}
        />
        {/* Description */}
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          onBlur={() => { if (description !== (issue.description ?? '')) save({ description }) }}
          placeholder="Add description..."
          rows={20}
          style={{ width: '100%', fontSize: 14, lineHeight: 1.6, border: '0.5px solid var(--border)', borderRadius: 6, padding: '12px 14px', background: 'transparent', color: description ? 'var(--text)' : 'var(--text-tertiary)', outline: 'none', resize: 'none', fontFamily: 'var(--font)', marginBottom: 16, boxSizing: 'border-box' }}
        />
        {/* Toolbar icons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 4, borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 9.5s.5 1.5 2.5 1.5 2.5-1.5 2.5-1.5M6 6.5h.01M10 6.5h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 4, borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 7.5L7.5 13a3.5 3.5 0 01-4.95-4.95l5.5-5.5a2 2 0 012.83 2.83L5.5 10.5a.5.5 0 01-.71-.71L10 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Add sub-issues */}
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 28 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          Add sub-issues
        </button>

        {/* Activity */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Activity</span>
            <button style={{ fontSize: 12, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>Unsubscribe</button>
          </div>
          {/* Created event */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-tertiary)' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>V</div>
            <span>Issue created · {timeAgo(issue.created_at)}</span>
          </div>
          {/* Comment box */}
          <div style={{ border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <textarea placeholder="Leave a comment..." rows={3}
              style={{ width: '100%', padding: '12px 14px', fontSize: 13, border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '8px 12px', borderTop: '0.5px solid var(--border)' }}>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 6.5L6.5 12a3.5 3.5 0 01-4.95-4.95l5.5-5.5a2 2 0 012.83 2.83L4.5 9.5a.5.5 0 01-.71-.71L9 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </button>
              <button style={{ background: '#2563eb', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TriageClient({ issues, pmEvents }: { issues: Issue[]; pmEvents: { id: string; name: string }[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(issues[0]?.id ?? null)
  const [showNew, setShowNew] = useState(false)

  const selected = issues.find(i => i.id === selectedId) ?? null

  async function handleAction(id: string, action: 'accept' | 'not_an_issue' | 'decline') {
    if (action === 'accept') {
      await acceptTriageIssue(id)
    } else if (action === 'not_an_issue') {
      await moveToNotAnIssue(id)
    } else {
      await updateIssue(id, { status: 'cancelled' })
    }
    const idx = issues.findIndex(i => i.id === id)
    const next = issues[idx + 1] ?? issues[idx - 1] ?? null
    setSelectedId(next?.id ?? null)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', fontFamily: 'var(--font)', overflow: 'hidden' }}>
      {showNew && <NewIssueModal onClose={() => setShowNew(false)} pmEvents={pmEvents} />}

      {/* Left panel — issue list */}
      <div style={{ width: 400, flexShrink: 0, borderRight: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', height: 46, padding: '0 16px', borderBottom: '0.5px solid var(--border)', flexShrink: 0, gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', flex: 1 }}>Triage</span>
          {/* Filter icon */}
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 5, borderRadius: 5 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
          {/* Display icon */}
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 5, borderRadius: 5 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="4" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 7h1M5.5 7h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="10" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 4h7M11.5 4h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="6" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 10h3M7.5 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {issues.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>No issues in triage</div>
          ) : (
            issues.map(issue => {
              const isActive = issue.id === selectedId
              return (
                <button key={issue.id} onClick={() => setSelectedId(issue.id)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 16px', border: 'none', borderBottom: '0.5px solid var(--border)',
                  background: isActive ? 'var(--bg-secondary)' : 'transparent',
                  cursor: 'pointer', fontFamily: 'var(--font)',
                  borderLeft: isActive ? '2px solid #2563eb' : '2px solid transparent',
                }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>{issueId(issue)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>V</div>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Vic</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{timeAgo(issue.created_at)}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right panel — detail or empty state */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selected ? (
          <IssueDetail key={selected.id} issue={selected as any} pmEvents={pmEvents} onAction={handleAction} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
            {/* Illustration */}
            <svg width="100" height="80" viewBox="0 0 100 80" fill="none" style={{ opacity: 0.4 }}>
              <rect x="10" y="20" width="30" height="6" rx="2" stroke="var(--text-tertiary)" strokeWidth="1.5"/>
              <rect x="10" y="32" width="20" height="6" rx="2" stroke="var(--text-tertiary)" strokeWidth="1.5"/>
              <rect x="50" y="10" width="6" height="30" rx="2" stroke="var(--text-tertiary)" strokeWidth="1.5"/>
              <rect x="62" y="10" width="6" height="20" rx="2" stroke="var(--text-tertiary)" strokeWidth="1.5"/>
              <rect x="74" y="10" width="6" height="40" rx="2" stroke="var(--text-tertiary)" strokeWidth="1.5"/>
              <path d="M20 50 Q30 40 40 50 Q50 60 60 50" stroke="var(--text-tertiary)" strokeWidth="1.5" fill="none"/>
            </svg>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {issues.length === 0 ? 'Nothing to triage' : `${issues.length} issue${issues.length === 1 ? '' : 's'} to triage`}
            </span>
            <button onClick={() => setShowNew(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 6, fontSize: 13,
              border: '0.5px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)',
            }}>
              + Create triage issue
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
