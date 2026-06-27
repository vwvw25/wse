'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createIssue } from './actions'
import { useRouter } from 'next/navigation'
import IssueDetailClient from './[id]/IssueDetailClient'

export type Issue = {
  id: string
  number: number | null
  title: string
  status: string
  priority: string | null
  label: string | null
  description: string | null
  due_date: string | null
  created_at: string
  updated_at: string | null
  pm_event_id: string | null
  pm_events: { id: string; name: string; date?: string | null } | null
  parent_issue_id: string | null
  source: string | null
  tasks?: { id: string; status: string }[]
}

export const LABEL_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  quote_request:        { bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
  confirmation_email:   { bg: 'rgba(52,211,153,0.1)',  color: '#34d399', border: 'rgba(52,211,153,0.3)' },
  contract_chaser:      { bg: 'rgba(249,115,22,0.1)',  color: '#fb923c', border: 'rgba(251,146,60,0.3)' },
  contract:             { bg: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: 'rgba(167,139,250,0.3)' },
  booked_event_question:{ bg: 'rgba(20,184,166,0.1)',  color: '#2dd4bf', border: 'rgba(45,212,191,0.3)' },
  musician_invoice:     { bg: 'rgba(234,179,8,0.1)',   color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  other:                { bg: 'var(--bg-secondary)',   color: 'var(--text-tertiary)', border: 'var(--border)' },
}

export const STATUSES = ['triage', 'backlog', 'todo', 'next_up', 'in_progress', 'waiting', 'done', 'cancelled']
export const STATUS_LABELS: Record<string, string> = {
  triage: 'Triage', backlog: 'Backlog', todo: 'To Do', next_up: 'Next Up',
  in_progress: 'In Progress', waiting: 'Waiting', done: 'Done', cancelled: 'Cancelled',
}
export const STATUS_COLORS: Record<string, string> = {
  triage: '#6b7280', backlog: '#9ca3af', todo: '#60a5fa',
  next_up: '#a78bfa', in_progress: '#f59e0b', waiting: '#f97316',
  done: '#34d399', cancelled: '#4b5563',
}
export const LABELS = ['quote_request', 'confirmation_email', 'contract_chaser', 'contract', 'booked_event_question', 'musician_invoice']
export const LABEL_DISPLAY: Record<string, string> = {
  quote_request: 'Quote Request', confirmation_email: 'Confirmation Email',
  contract_chaser: 'Contract Chaser', contract: 'Contract',
  booked_event_question: 'Booked Event Question', musician_invoice: 'Musician Invoice',
}

export function StatusCircle({ status, size = 14 }: { status: string; size?: number }) {
  const color = STATUS_COLORS[status] ?? '#9ca3af'
  const r = size / 2
  const isDone = status === 'done'
  const isCancelled = status === 'cancelled'
  const isInProgress = status === 'in_progress'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, display: 'block' }}>
      {isCancelled ? (
        <circle cx={r} cy={r} r={r - 1} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2 1.5" />
      ) : isDone ? (
        <>
          <circle cx={r} cy={r} r={r - 1} fill={color} />
          <path d={`M${r*0.38} ${r} l${r*0.35} ${r*0.38} l${r*0.6} -${r*0.65}`} stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      ) : isInProgress ? (
        <>
          <circle cx={r} cy={r} r={r - 1} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.3" />
          <path d={`M${r} ${1.2} A${r-1.2} ${r-1.2} 0 0 1 ${size-1.2} ${r}`} stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <circle cx={r} cy={r} r={r - 1} fill="none" stroke={color} strokeWidth="1.5" />
      )}
    </svg>
  )
}

function PriorityIndicator({ priority }: { priority: string | null }) {
  const colors: Record<string, string> = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280' }
  const color = priority ? colors[priority] : 'currentColor'
  const opacity = priority ? 1 : 0.25
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0, color: 'var(--text-tertiary)', opacity }}>
      <rect x="1" y="7" width="2" height="4" rx="0.5" fill={priority ? color : 'currentColor'} />
      <rect x="5" y="4" width="2" height="7" rx="0.5" fill={priority ? color : 'currentColor'} />
      <rect x="9" y="1" width="2" height="10" rx="0.5" fill={priority ? color : 'currentColor'} />
    </svg>
  )
}

function issueId(issue: Issue) {
  return issue.number ? `WSE-${issue.number}` : `WSE-${issue.id.slice(0, 4).toUpperCase()}`
}

function NewIssueModal({ onClose, pmEvents }: { onClose: () => void; pmEvents: { id: string; name: string }[] }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('todo')
  const [priority, setPriority] = useState('')
  const [label, setLabel] = useState('')
  const [pmEventId, setPmEventId] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    if (!title.trim() || saving) return
    setSaving(true)
    await createIssue({ title: title.trim(), description: description || null, status, priority: priority || null, label: label || null, pm_event_id: pmEventId || null, source: 'manual' })
    router.refresh()
    onClose()
  }

  const pill = (label: string, icon: React.ReactNode, active = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 9px', borderRadius: 6, fontSize: 12,
    border: `1px solid ${active ? 'var(--border-hover)' : 'var(--border)'}`,
    background: 'transparent', color: 'var(--text-secondary)',
    cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg)', borderRadius: 10,
        border: '0.5px solid var(--border)', width: 640, maxWidth: '95vw',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderBottom: '0.5px solid var(--border)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: '#16a34a', fontSize: 10, fontWeight: 700, color: '#fff' }}>W</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>›</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>New issue</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>

        <div style={{ padding: '16px 20px 8px' }}>
          <input
            autoFocus
            placeholder="Issue title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
            style={{
              width: '100%', fontSize: 16, fontWeight: 500, padding: 0,
              border: 'none', background: 'transparent', color: 'var(--text)',
              outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)',
              marginBottom: 10,
            }}
          />
          <textarea
            placeholder="Add description..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            style={{
              width: '100%', fontSize: 13.5, padding: 0,
              border: 'none', background: 'transparent', color: 'var(--text-secondary)',
              outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: '0.5px solid var(--border)', gap: 6, flexWrap: 'wrap' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 4 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 6.5L6.5 12a3.5 3.5 0 01-4.95-4.95l5.5-5.5a2 2 0 012.83 2.83L4.5 9.5a.5.5 0 01-.71-.71L9 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...pill('', null, true), appearance: 'none' as any }}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...pill('', null, !!priority), appearance: 'none' as any }}>
            <option value="">Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={label} onChange={e => setLabel(e.target.value)} style={{ ...pill('', null, !!label), appearance: 'none' as any }}>
            <option value="">Labels</option>
            {LABELS.map(l => <option key={l} value={l}>{LABEL_DISPLAY[l]}</option>)}
          </select>
          <select value={pmEventId} onChange={e => setPmEventId(e.target.value)} style={{ ...pill('', null, !!pmEventId), appearance: 'none' as any }}>
            <option value="">Event</option>
            {pmEvents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={onClose} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 13,
              border: '0.5px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)',
            }}>Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={!title.trim() || saving} style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 13,
              background: '#2563eb', color: '#fff', border: 'none',
              cursor: title.trim() && !saving ? 'pointer' : 'default',
              opacity: title.trim() && !saving ? 1 : 0.5, fontFamily: 'var(--font)', fontWeight: 500,
            }}>Create issue</button>
          </div>
        </div>
      </div>
    </div>
  )
}

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

function IssueRow({ issue, selected, onSelect }: {
  issue: Issue
  selected: boolean
  onSelect: (id: string) => void
}) {
  const lc = LABEL_COLORS[issue.label ?? ''] ?? LABEL_COLORS['other']
  const eventName = issue.pm_events?.name
  const eventDate = issue.pm_events?.date
    ? new Date(issue.pm_events.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  return (
    <button
      onClick={() => onSelect(issue.id)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '11px 16px', border: 'none', borderBottom: '0.5px solid var(--border)',
        background: selected ? 'var(--bg-secondary)' : 'transparent',
        cursor: 'pointer', fontFamily: 'var(--font)',
        borderLeft: selected ? '2px solid #2563eb' : '2px solid transparent',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-secondary)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Row 1: title + WSE-XXX */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {issue.title}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>{issueId(issue)}</span>
      </div>
      {/* Row 2: status dot | label | event | time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <StatusCircle status={issue.status} size={11} />
        {issue.label && (
          <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 20, background: lc.bg, color: lc.color, border: `0.5px solid ${lc.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {LABEL_DISPLAY[issue.label]}
          </span>
        )}
        {eventName && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {eventName}{eventDate ? ` · ${eventDate}` : ''}
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', marginLeft: 'auto', flexShrink: 0 }}>
          {timeAgo(issue.created_at)}
        </span>
      </div>
    </button>
  )
}

function StatusGroup({ status, issues, defaultOpen = true, selectedId, onSelect }: {
  status: string
  issues: Issue[]
  defaultOpen?: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (issues.length === 0) return null

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', height: 32,
          padding: '0 16px', borderBottom: '0.5px solid var(--border)',
          cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', color: 'var(--text-tertiary)' }}>
            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <StatusCircle status={status} size={13} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginRight: 6 }}>
          {STATUS_LABELS[status]}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{issues.length}</span>
      </div>
      {open && issues.map(issue => (
        <IssueRow key={issue.id} issue={issue} selected={selectedId === issue.id} onSelect={onSelect} />
      ))}
    </div>
  )
}

type FilterState = {
  priorities: string[]
  labels: string[]
}

type DisplayProps = {
  id: boolean
  status: boolean
  assignee: boolean
  priority: boolean
  dueDate: boolean
  labels: boolean
  created: boolean
  updated: boolean
}

type DisplayState = {
  viewMode: 'list' | 'board'
  groupBy: 'status' | 'priority' | 'none'
  orderBy: 'created' | 'updated' | 'priority'
  showTasks: boolean
  showTriageIssues: boolean
  showEmptyGroups: boolean
  nestedTasks: boolean
  props: DisplayProps
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: 34, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
      background: on ? '#2563eb' : 'var(--border-hover)',
      position: 'relative', transition: 'background 0.15s', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 3, width: 14, height: 14, borderRadius: '50%', background: '#fff',
        transition: 'left 0.15s', left: on ? 17 : 3,
      }} />
    </button>
  )
}

function MiniSelect({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      fontSize: 13, padding: '3px 8px', borderRadius: 6,
      border: '0.5px solid var(--border)', background: 'var(--bg-secondary)',
      color: 'var(--text)', fontFamily: 'var(--font)', cursor: 'pointer', outline: 'none',
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function IssueFilterPanel({ view, setView, filters, setFilters, onClose }: {
  view: 'all' | 'active' | 'backlog'
  setView: (v: 'all' | 'active' | 'backlog') => void
  filters: FilterState
  setFilters: (f: FilterState) => void
  onClose: () => void
}) {
  function toggle<T>(arr: T[], val: T) {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  const hasAny = filters.priorities.length > 0 || filters.labels.length > 0 || view !== 'all'

  const SectionHead = ({ label }: { label: string }) => (
    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', padding: '8px 12px 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
  )

  const CheckRow = ({ label, checked, onToggle, icon }: { label: string; checked: boolean; onToggle: () => void; icon?: React.ReactNode }) => (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
      padding: '5px 12px', border: 'none', background: 'transparent',
      color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, textAlign: 'left',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${checked ? '#2563eb' : 'var(--border-hover)'}`, background: checked ? '#2563eb' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {checked && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      {icon && <span style={{ marginRight: 2 }}>{icon}</span>}{label}
    </button>
  )

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={onClose} />
      <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 200, background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 8, minWidth: 220, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', paddingBottom: 6, marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 6px', borderBottom: '0.5px solid var(--border)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Filter</span>
          {hasAny && <button onClick={() => { setView('all'); setFilters({ priorities: [], labels: [] }) }} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear all</button>}
        </div>

        <SectionHead label="View" />
        {(['all', 'active', 'backlog'] as const).map(v => (
          <CheckRow key={v} label={v === 'all' ? 'All issues' : v.charAt(0).toUpperCase() + v.slice(1)} checked={view === v} onToggle={() => setView(v)} />
        ))}

        <div style={{ height: '0.5px', background: 'var(--border)', margin: '4px 0' }} />
        <SectionHead label="Status" />
        {STATUSES.map(s => (
          <CheckRow key={s} label={STATUS_LABELS[s]} checked={filters.priorities.includes(s)}
            onToggle={() => setFilters({ ...filters, priorities: toggle(filters.priorities, s) })}
            icon={<StatusCircle status={s} size={12} />}
          />
        ))}

        <div style={{ height: '0.5px', background: 'var(--border)', margin: '4px 0' }} />
        <SectionHead label="Label" />
        {LABELS.map(l => (
          <CheckRow key={l} label={LABEL_DISPLAY[l]} checked={filters.labels.includes(l)}
            onToggle={() => setFilters({ ...filters, labels: toggle(filters.labels, l) })}
          />
        ))}
      </div>
    </>
  )
}

function DisplayPanel({ display, onChange, onClose }: {
  display: DisplayState
  onChange: (d: DisplayState) => void
  onClose: () => void
}) {
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', minHeight: 36, gap: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
      {children}
    </div>
  )

  const Sep = () => <div style={{ height: '0.5px', background: 'var(--border)', margin: '4px 0' }} />
  const SectionLabel = ({ label }: { label: string }) => (
    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', padding: '8px 16px 2px' }}>{label}</div>
  )

  const allProps: { key: keyof DisplayProps; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'status', label: 'Status' },
    { key: 'assignee', label: 'Assignee' },
    { key: 'priority', label: 'Priority' },
    { key: 'dueDate', label: 'Due date' },
    { key: 'labels', label: 'Labels' },
    { key: 'created', label: 'Created' },
    { key: 'updated', label: 'Updated' },
  ]

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, zIndex: 200,
      background: 'var(--bg)', border: '0.5px solid var(--border)',
      borderRadius: 8, width: 296, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      overflowY: 'auto', maxHeight: 'calc(100vh - 80px)',
    }}>
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderBottom: '0.5px solid var(--border)' }}>
        {(['List', 'Board'] as const).map(v => {
          const mode = v === 'List' ? 'list' : 'board'
          const active = display.viewMode === mode
          return (
            <button key={v} onClick={() => onChange({ ...display, viewMode: mode })} style={{
              flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              border: '0.5px solid var(--border)', fontFamily: 'var(--font)',
              background: active ? 'var(--bg-secondary)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text-tertiary)',
              fontWeight: active ? 500 : 400,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {v === 'List'
                ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 3.5h10M1.5 6.5h10M1.5 9.5h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                : <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="4.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="7.5" y="1" width="4.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
              }
              {v}
            </button>
          )
        })}
      </div>

      <Row label="Grouping">
        <MiniSelect value={display.groupBy} onChange={v => onChange({ ...display, groupBy: v as DisplayState['groupBy'] })}
          options={[{ value: 'status', label: 'Status' }, { value: 'priority', label: 'Priority' }, { value: 'none', label: 'No grouping' }]} />
      </Row>
      <Row label="Sub-grouping">
        <MiniSelect value="none" onChange={() => {}} options={[{ value: 'none', label: 'No grouping' }]} />
      </Row>
      <Row label="Ordering">
        <MiniSelect value={display.orderBy} onChange={v => onChange({ ...display, orderBy: v as DisplayState['orderBy'] })}
          options={[{ value: 'priority', label: 'Priority' }, { value: 'created', label: 'Created' }, { value: 'updated', label: 'Updated' }]} />
      </Row>
      <Row label="Order completed by recency">
        <Toggle on={true} onToggle={() => {}} />
      </Row>
      <Sep />
      <Row label="Completed issues">
        <MiniSelect value="all" onChange={() => {}} options={[{ value: 'all', label: 'All' }, { value: 'none', label: 'None' }, { value: 'last7', label: 'Last 7 days' }]} />
      </Row>
      <Row label="Show tasks">
        <Toggle on={display.showTasks} onToggle={() => onChange({ ...display, showTasks: !display.showTasks })} />
      </Row>
      <Row label="Show triage issues">
        <Toggle on={display.showTriageIssues} onToggle={() => onChange({ ...display, showTriageIssues: !display.showTriageIssues })} />
      </Row>
      <Sep />
      <SectionLabel label="List options" />
      <Row label="Nested tasks">
        <Toggle on={display.nestedTasks} onToggle={() => onChange({ ...display, nestedTasks: !display.nestedTasks })} />
      </Row>
      <Row label="Show empty groups">
        <Toggle on={display.showEmptyGroups} onToggle={() => onChange({ ...display, showEmptyGroups: !display.showEmptyGroups })} />
      </Row>
      <Sep />
      <SectionLabel label="Display properties" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 16px 12px' }}>
        {allProps.map(({ key, label }) => (
          <button key={key}
            onClick={() => onChange({ ...display, props: { ...display.props, [key]: !display.props[key] } })}
            style={{
              padding: '4px 11px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              border: `0.5px solid ${display.props[key] ? 'var(--text-secondary)' : 'var(--border)'}`,
              background: display.props[key] ? 'var(--bg-secondary)' : 'transparent',
              color: display.props[key] ? 'var(--text)' : 'var(--text-tertiary)',
              fontFamily: 'var(--font)',
            }}
          >{label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '0.5px solid var(--border)' }}>
        <button onClick={() => onChange(DEFAULT_DISPLAY)}
          style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>
          Reset
        </button>
        <button style={{ fontSize: 13, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>
          Set default for everyone
        </button>
      </div>
    </div>
  )
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, '': 4 }

function KanbanBoard({ issues, groupBy, displayProps, selectedId, onSelect }: {
  issues: Issue[]
  groupBy: 'status' | 'priority' | 'none'
  displayProps: DisplayProps
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const columns = groupBy === 'priority'
    ? [
        { key: 'urgent', label: 'Urgent' },
        { key: 'high', label: 'High' },
        { key: 'medium', label: 'Medium' },
        { key: 'low', label: 'Low' },
        { key: '', label: 'No priority' },
      ]
    : STATUSES.map(s => ({ key: s, label: STATUS_LABELS[s] }))

  return (
    <div style={{ display: 'flex', gap: 12, padding: '16px', overflowX: 'auto', alignItems: 'flex-start', height: '100%', boxSizing: 'border-box' }}>
      {columns.map(col => {
        const colIssues = groupBy === 'priority'
          ? issues.filter(i => (i.priority ?? '') === col.key)
          : issues.filter(i => i.status === col.key)

        return (
          <div key={col.key} style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 2px' }}>
              {groupBy === 'status'
                ? <StatusCircle status={col.key} size={13} />
                : <PriorityIndicator priority={col.key || null} />
              }
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{col.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 2 }}>{colIssues.length}</span>
              <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>+</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {colIssues.map(issue => (
                <a key={issue.id} href={`/admin/issues?id=${issue.id}`}
                  onClick={e => { e.preventDefault(); onSelect(issue.id) }}
                  style={{
                    display: 'block', padding: '10px 12px', borderRadius: 8,
                    border: `0.5px solid ${selectedId === issue.id ? '#2563eb' : 'var(--border)'}`,
                    background: selectedId === issue.id ? 'var(--bg-secondary)' : 'var(--bg)',
                    textDecoration: 'none', color: 'var(--text)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { if (selectedId !== issue.id) e.currentTarget.style.borderColor = 'var(--border-hover)' }}
                  onMouseLeave={e => { if (selectedId !== issue.id) e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 8, color: 'var(--text)' }}>
                    {issue.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {displayProps.id && (
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {issue.number ? `WSE-${issue.number}` : `WSE-${issue.id.slice(0,4).toUpperCase()}`}
                      </span>
                    )}
                    {displayProps.priority && groupBy !== 'priority' && (
                      <PriorityIndicator priority={issue.priority} />
                    )}
                    {displayProps.status && groupBy === 'priority' && (
                      <StatusCircle status={issue.status} size={12} />
                    )}
                    {displayProps.labels && issue.label && (
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, border: '0.5px solid var(--border)', color: 'var(--text-tertiary)' }}>
                        {LABEL_DISPLAY[issue.label]}
                      </span>
                    )}
                    {issue.tasks && issue.tasks.length > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                        {issue.tasks.filter(s => s.status === 'done').length}/{issue.tasks.length}
                      </span>
                    )}
                    {displayProps.assignee && (
                      <div style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <circle cx="5" cy="3.5" r="2" stroke="var(--text-tertiary)" strokeWidth="1.1"/>
                          <path d="M1 9c0-2 1.79-3 4-3s4 1 4 3" stroke="var(--text-tertiary)" strokeWidth="1.1" strokeLinecap="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </a>
              ))}

              <button style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                padding: '8px 10px', borderRadius: 8, border: '0.5px dashed var(--border)',
                background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer',
                fontSize: 12, fontFamily: 'var(--font)',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                Add issue
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const DEFAULT_DISPLAY: DisplayState = {
  viewMode: 'list', groupBy: 'status', orderBy: 'priority',
  showTasks: true, showTriageIssues: true, showEmptyGroups: false, nestedTasks: true,
  props: { id: true, status: true, assignee: true, priority: true, dueDate: false, labels: true, created: true, updated: false },
}

export default function IssuesClient({ issues, pmEvents }: { issues: Issue[]; pmEvents: { id: string; name: string }[] }) {
  const router = useRouter()
  const [view, setView] = useState<'all' | 'active' | 'backlog'>('all')
  const [showNew, setShowNew] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState<FilterState>({ priorities: [], labels: [] })
  const [display] = useState<DisplayState>(DEFAULT_DISPLAY)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [subIssues, setSubIssues] = useState<Issue[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Read initial selection from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) setSelectedId(id)
  }, [])

  // Fetch sub-issues when selection changes
  const fetchSubIssues = useCallback(async (id: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/issues/${id}`)
      const data = await res.json()
      setSubIssues(data.subIssues ?? [])
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedId) { setSubIssues([]); return }
    fetchSubIssues(selectedId)
  }, [selectedId, fetchSubIssues])

  function selectIssue(id: string) {
    setSelectedId(id)
    window.history.replaceState(null, '', `/admin/issues?id=${id}`)
  }

  function clearSelection() {
    setSelectedId(null)
    window.history.replaceState(null, '', '/admin/issues')
    router.refresh()
  }

  const triageCount = issues.filter(i => i.status === 'triage').length
  const hasFilters = filters.priorities.length > 0 || filters.labels.length > 0

  let filtered = issues.filter(i => {
    if (!display.showTriageIssues && i.status === 'triage') return false
    if (view === 'active') return ['todo', 'next_up', 'in_progress', 'waiting'].includes(i.status)
    if (view === 'backlog') return i.status === 'backlog'
    return true
  })

  if (filters.priorities.length > 0) {
    filtered = filtered.filter(i => filters.priorities.includes(i.status))
  }
  if (filters.labels.length > 0) {
    filtered = filtered.filter(i => i.label && filters.labels.includes(i.label))
  }

  filtered = [...filtered].sort((a, b) => {
    if (display.orderBy === 'priority') return (PRIORITY_ORDER[a.priority ?? ''] ?? 4) - (PRIORITY_ORDER[b.priority ?? ''] ?? 4)
    if (display.orderBy === 'updated') return new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime()
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const grouped = STATUSES.reduce<Record<string, Issue[]>>((acc, s) => {
    acc[s] = filtered.filter(i => i.status === s)
    return acc
  }, {})

  const selectedIssue = selectedId ? (issues.find(i => i.id === selectedId) ?? null) : null

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px', fontSize: 13, background: 'none', border: 'none',
    borderRadius: 6, cursor: 'pointer',
    color: active ? 'var(--text)' : 'var(--text-secondary)',
    backgroundColor: active ? 'var(--bg-secondary)' : 'transparent',
    fontFamily: 'var(--font)', fontWeight: active ? 500 : 400,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  })

  const iconBtn = (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--bg-secondary)' : 'none',
    border: 'none', cursor: 'pointer',
    color: active ? 'var(--text)' : 'var(--text-tertiary)',
    display: 'flex', padding: 6, borderRadius: 5, position: 'relative',
  })

  return (
    <div style={{ fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      {showNew && <NewIssueModal onClose={() => setShowNew(false)} pmEvents={pmEvents} />}

      {/* Top bar — full width */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 16px', height: 46,
        borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>WSE</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>›</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Issues</span>
        </div>
        <button onClick={() => setShowNew(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', borderRadius: 6, fontSize: 13,
          background: '#2563eb', color: '#fff', border: 'none',
          cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500,
        }}>+ New issue</button>
      </div>

      {/* Body — split pane */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left panel — issue list */}
        <div style={{
          width: 440, flexShrink: 0,
          borderRight: '0.5px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* List header with filter */}
          <div style={{ display: 'flex', alignItems: 'center', height: 40, padding: '0 12px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flex: 1 }}>
              {filtered.length} {filtered.length === 1 ? 'issue' : 'issues'}
            </span>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowFilter(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 9px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  border: `0.5px solid ${hasFilters ? '#2563eb' : 'var(--border)'}`,
                  background: hasFilters ? 'rgba(37,99,235,0.08)' : 'transparent',
                  color: hasFilters ? '#2563eb' : 'var(--text-secondary)',
                  fontFamily: 'var(--font)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                Filter{hasFilters ? ` (${filters.priorities.length + filters.labels.length + (view !== 'all' ? 1 : 0)})` : ''}
              </button>
              {showFilter && <IssueFilterPanel view={view} setView={setView} filters={filters} setFilters={setFilters} onClose={() => setShowFilter(false)} />}
            </div>
          </div>

          {/* Scrollable list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '80px 32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                {hasFilters ? 'No issues match your filters.' : 'No issues'}
              </div>
            ) : display.viewMode === 'board' ? (
              <div style={{ overflowX: 'auto', height: '100%' }}>
                <KanbanBoard issues={filtered} groupBy={display.groupBy === 'none' ? 'status' : display.groupBy} displayProps={display.props} selectedId={selectedId} onSelect={selectIssue} />
              </div>
            ) : display.groupBy === 'status' ? (
              STATUSES.map(s => {
                if (!display.showEmptyGroups && grouped[s].length === 0) return null
                return <StatusGroup key={s} status={s} issues={grouped[s]} defaultOpen={!['done', 'cancelled'].includes(s)} selectedId={selectedId} onSelect={selectIssue} />
              })
            ) : display.groupBy === 'priority' ? (
              ['urgent', 'high', 'medium', 'low', ''].map(p => {
                const group = filtered.filter(i => (i.priority ?? '') === p)
                if (group.length === 0) return null
                const label = p ? p.charAt(0).toUpperCase() + p.slice(1) : 'No priority'
                return (
                  <div key={p || 'none'}>
                    <div style={{ display: 'flex', alignItems: 'center', height: 32, padding: '0 16px', borderBottom: '0.5px solid var(--border)', gap: 8 }}>
                      <PriorityIndicator priority={p || null} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{group.length}</span>
                    </div>
                    {group.map(issue => <IssueRow key={issue.id} issue={issue} selected={selectedId === issue.id} onSelect={selectIssue} />)}
                  </div>
                )
              })
            ) : (
              filtered.map(issue => <IssueRow key={issue.id} issue={issue} selected={selectedId === issue.id} onSelect={selectIssue} />)
            )}
          </div>
        </div>

        {/* Right panel — issue detail */}
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {selectedIssue ? (
            <IssueDetailClient
              key={selectedIssue.id}
              issue={selectedIssue}
              subIssues={loadingDetail ? [] : subIssues}
              pmEvents={pmEvents}
              onDelete={clearSelection}
              onRefreshSubIssues={() => fetchSubIssues(selectedIssue.id)}
            />
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'var(--text-tertiary)', fontSize: 13, gap: 8,
            }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.3 }}>
                <rect x="4" y="4" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 12h12M10 16h8M10 20h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Select an issue to view details</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
