'use client'

import React, { useState } from 'react'
import { createIssue } from './actions'
import { useRouter } from 'next/navigation'

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
  pm_events: { id: string; name: string } | null
  parent_issue_id: string | null
  source: string | null
  tasks?: { id: string; status: string }[]
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
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderBottom: '0.5px solid var(--border)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: '#16a34a', fontSize: 10, fontWeight: 700, color: '#fff' }}>W</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>›</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>New issue</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>

        {/* Title + description */}
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

        {/* Bottom toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: '0.5px solid var(--border)', gap: 6, flexWrap: 'wrap' }}>
          {/* Attachment */}
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 4 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 6.5L6.5 12a3.5 3.5 0 01-4.95-4.95l5.5-5.5a2 2 0 012.83 2.83L4.5 9.5a.5.5 0 01-.71-.71L9 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>

          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />

          {/* Status pill */}
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...pill('', null, true), appearance: 'none' as any }}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>

          {/* Priority pill */}
          <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...pill('', null, !!priority), appearance: 'none' as any }}>
            <option value="">Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Label pill */}
          <select value={label} onChange={e => setLabel(e.target.value)} style={{ ...pill('', null, !!label), appearance: 'none' as any }}>
            <option value="">Labels</option>
            {LABELS.map(l => <option key={l} value={l}>{LABEL_DISPLAY[l]}</option>)}
          </select>

          {/* Event pill */}
          <select value={pmEventId} onChange={e => setPmEventId(e.target.value)} style={{ ...pill('', null, !!pmEventId), appearance: 'none' as any }}>
            <option value="">Event</option>
            {pmEvents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          {/* Right side */}
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

function IssueRow({ issue, displayProps }: { issue: Issue; displayProps?: DisplayProps }) {
  const dp = displayProps ?? { id: true, status: true, assignee: true, priority: true, dueDate: false, labels: true, created: true, updated: false }
  const [hovered, setHovered] = useState(false)
  const date = new Date(issue.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <a
      href={`/admin/issues/${issue.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', height: 34,
        padding: '0 16px', textDecoration: 'none', color: 'var(--text)',
        background: hovered ? 'var(--bg-secondary)' : 'transparent',
        borderBottom: '0.5px solid var(--border)',
        gap: 0,
      }}
    >
      {/* Drag handle — always present, visible on hover */}
      <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: hovered ? 1 : 0 }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="4" cy="3" r="1" fill="var(--text-tertiary)"/>
          <circle cx="8" cy="3" r="1" fill="var(--text-tertiary)"/>
          <circle cx="4" cy="6" r="1" fill="var(--text-tertiary)"/>
          <circle cx="8" cy="6" r="1" fill="var(--text-tertiary)"/>
          <circle cx="4" cy="9" r="1" fill="var(--text-tertiary)"/>
          <circle cx="8" cy="9" r="1" fill="var(--text-tertiary)"/>
        </svg>
      </div>

      {/* Priority */}
      {dp.priority && (
        <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PriorityIndicator priority={issue.priority} />
        </div>
      )}

      {/* Issue ID */}
      {dp.id && (
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginRight: 10, marginLeft: 4, whiteSpace: 'nowrap', flexShrink: 0, minWidth: 48 }}>
          {issueId(issue)}
        </span>
      )}

      {/* Status circle */}
      {dp.status && (
        <div style={{ marginRight: 8, flexShrink: 0 }}>
          <StatusCircle status={issue.status} size={14} />
        </div>
      )}

      {/* Title */}
      <span style={{ flex: 1, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {issue.title}
      </span>

      {/* Sub-issue count pill */}
      {issue.tasks && issue.tasks.length > 0 && (() => {
        const total = issue.tasks.length
        const done = issue.tasks.filter(s => s.status === 'done').length
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 7px', borderRadius: 20, border: '0.5px solid var(--border)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', marginLeft: 8 }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/></svg>
            {done}/{total}
          </span>
        )
      })()}

      {/* Label */}
      {dp.labels && issue.label && (
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, border: '0.5px solid var(--border)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', marginLeft: 8 }}>
          {LABEL_DISPLAY[issue.label]}
        </span>
      )}

      {/* Event */}
      {issue.pm_events && (
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', marginLeft: 12 }}>
          {issue.pm_events.name}
        </span>
      )}

      {/* Assignee avatar — LEFT of date, matching Linear */}
      {dp.assignee && (
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--border)', marginLeft: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <circle cx="5.5" cy="4" r="2" stroke="var(--text-tertiary)" strokeWidth="1.2"/>
            <path d="M1.5 10c0-2.21 1.79-3.5 4-3.5s4 1.29 4 3.5" stroke="var(--text-tertiary)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      {/* Date — RIGHT of assignee */}
      {dp.created && (
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', marginLeft: 8, minWidth: 36, textAlign: 'right' }}>
          {date}
        </span>
      )}
    </a>
  )
}

function StatusGroup({ status, issues, defaultOpen = true, displayProps }: { status: string; issues: Issue[]; defaultOpen?: boolean; displayProps?: DisplayProps }) {
  const [open, setOpen] = useState(defaultOpen)
  if (issues.length === 0) return null

  return (
    <div>
      {/* Group header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', height: 34,
          padding: '0 16px', borderBottom: '0.5px solid var(--border)',
          cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setOpen(o => !o)}
      >
        {/* Collapse chevron */}
        <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', color: 'var(--text-tertiary)' }}>
            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <StatusCircle status={status} size={14} />
        </div>

        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginRight: 6 }}>
          {STATUS_LABELS[status]}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{issues.length}</span>

        <button
          onClick={e => { e.stopPropagation(); /* add issue with this status */ }}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
        >+</button>
      </div>

      {open && issues.map(issue => <IssueRow key={issue.id} issue={issue} displayProps={displayProps} />)}
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

function FilterPanel({ filters, onChange, onClose }: {
  filters: FilterState
  onChange: (f: FilterState) => void
  onClose: () => void
}) {
  function toggle<T>(arr: T[], val: T) {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  const hasFilters = filters.priorities.length > 0 || filters.labels.length > 0

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
      {icon}{label}
    </button>
  )

  return (
    <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 200, background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 8, minWidth: 220, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', paddingBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 6px', borderBottom: '0.5px solid var(--border)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Filter</span>
        {hasFilters && <button onClick={() => onChange({ priorities: [], labels: [] })} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear all</button>}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', padding: '8px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority</div>
      {['urgent','high','medium','low'].map(p => (
        <CheckRow key={p} label={p.charAt(0).toUpperCase()+p.slice(1)} checked={filters.priorities.includes(p)}
          onToggle={() => onChange({ ...filters, priorities: toggle(filters.priorities, p) })}
          icon={<span style={{ marginRight: 2 }}><PriorityIndicator priority={p} /></span>}
        />
      ))}
      <CheckRow label="No priority" checked={filters.priorities.includes('none')}
        onToggle={() => onChange({ ...filters, priorities: toggle(filters.priorities, 'none') })}
        icon={<span style={{ marginRight: 2 }}><PriorityIndicator priority={null} /></span>}
      />
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', padding: '8px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.06em', borderTop: '0.5px solid var(--border)', marginTop: 4 }}>Label</div>
      {LABELS.map(l => (
        <CheckRow key={l} label={LABEL_DISPLAY[l]} checked={filters.labels.includes(l)}
          onToggle={() => onChange({ ...filters, labels: toggle(filters.labels, l) })}
        />
      ))}
    </div>
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
      {/* List / Board toggle */}
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

function KanbanBoard({ issues, groupBy, displayProps }: {
  issues: Issue[]
  groupBy: 'status' | 'priority' | 'none'
  displayProps: DisplayProps
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
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 2px' }}>
              {groupBy === 'status'
                ? <StatusCircle status={col.key} size={13} />
                : <PriorityIndicator priority={col.key || null} />
              }
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{col.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 2 }}>{colIssues.length}</span>
              <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>+</button>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {colIssues.map(issue => (
                <a key={issue.id} href={`/admin/issues/${issue.id}`} style={{
                  display: 'block', padding: '10px 12px', borderRadius: 8,
                  border: '0.5px solid var(--border)', background: 'var(--bg)',
                  textDecoration: 'none', color: 'var(--text)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  {/* Title */}
                  <div style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 8, color: 'var(--text)' }}>
                    {issue.title}
                  </div>

                  {/* Bottom row */}
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

              {/* Add card button */}
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
  const [view, setView] = useState<'all' | 'active' | 'backlog'>('all')
  const [showNew, setShowNew] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [showDisplay, setShowDisplay] = useState(false)
  const [filters, setFilters] = useState<FilterState>({ priorities: [], labels: [] })
  const [display, setDisplay] = useState<DisplayState>(DEFAULT_DISPLAY)

  const triageCount = issues.filter(i => i.status === 'triage').length
  const hasFilters = filters.priorities.length > 0 || filters.labels.length > 0

  // Apply view + triage filter
  let filtered = issues.filter(i => {
    if (!display.showTriageIssues && i.status === 'triage') return false
    if (view === 'active') return ['todo', 'next_up', 'in_progress', 'waiting'].includes(i.status)
    if (view === 'backlog') return i.status === 'backlog'
    return true
  })

  // Apply user filters
  if (filters.priorities.length > 0) {
    filtered = filtered.filter(i =>
      filters.priorities.includes(i.priority ?? 'none')
    )
  }
  if (filters.labels.length > 0) {
    filtered = filtered.filter(i => i.label && filters.labels.includes(i.label))
  }

  // Apply ordering
  filtered = [...filtered].sort((a, b) => {
    if (display.orderBy === 'priority') return (PRIORITY_ORDER[a.priority ?? ''] ?? 4) - (PRIORITY_ORDER[b.priority ?? ''] ?? 4)
    if (display.orderBy === 'updated') return new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime()
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const grouped = STATUSES.reduce<Record<string, Issue[]>>((acc, s) => {
    acc[s] = filtered.filter(i => i.status === s)
    return acc
  }, {})

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
    <div style={{ fontFamily: 'var(--font)', position: 'relative' }}>
      {showNew && <NewIssueModal onClose={() => setShowNew(false)} pmEvents={pmEvents} />}

      {/* Display panel — fixed, top-right, like Linear */}
      {showDisplay && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowDisplay(false)} />
          <div style={{ position: 'fixed', top: 52, right: 0, zIndex: 200 }}>
            <DisplayPanel display={display} onChange={setDisplay} onClose={() => setShowDisplay(false)} />
          </div>
        </>
      )}

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 16px', height: 46,
        borderBottom: '0.5px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>WSE</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>›</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Issues</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Filter */}
          <div style={{ position: 'relative' }}>
            <button style={iconBtn(showFilter || hasFilters)}
              onClick={() => { setShowFilter(o => !o); setShowDisplay(false) }}
              onMouseEnter={e => { if (!showFilter && !hasFilters) e.currentTarget.style.background = 'var(--bg-secondary)' }}
              onMouseLeave={e => { if (!showFilter && !hasFilters) e.currentTarget.style.background = 'none' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              {hasFilters && <span style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} />}
            </button>
            {showFilter && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowFilter(false)} />
                <FilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilter(false)} />
              </>
            )}
          </div>

          {/* Display */}
          <button style={iconBtn(showDisplay)}
            onClick={() => { setShowDisplay(o => !o); setShowFilter(false) }}
            onMouseEnter={e => { if (!showDisplay) e.currentTarget.style.background = 'var(--bg-secondary)' }}
            onMouseLeave={e => { if (!showDisplay) e.currentTarget.style.background = 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="4" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1.5 7h1M5.5 7h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="10" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1.5 4h7M11.5 4h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="6" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1.5 10h3M7.5 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>

          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <button onClick={() => setShowNew(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 6, fontSize: 13,
            background: '#2563eb', color: '#fff', border: 'none',
            cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500,
          }}>+ New issue</button>
        </div>
      </div>

      {/* Tabs + filter chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 12px', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
        <button style={tabStyle(view === 'all')} onClick={() => setView('all')}>
          All issues
          {triageCount > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 16, borderRadius: 8, fontSize: 10, fontWeight: 700, background: '#ef4444', color: '#fff', padding: '0 4px' }}>{triageCount}</span>}
        </button>
        <button style={tabStyle(view === 'active')} onClick={() => setView('active')}>Active</button>
        <button style={tabStyle(view === 'backlog')} onClick={() => setView('backlog')}>Backlog</button>

        {hasFilters && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 8, flexWrap: 'wrap' }}>
            {filters.priorities.map(p => (
              <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 20, border: '0.5px solid #2563eb', color: '#2563eb', background: 'rgba(37,99,235,0.08)' }}>
                Priority: {p === 'none' ? 'None' : p}
                <button onClick={() => setFilters(f => ({ ...f, priorities: f.priorities.filter(x => x !== p) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
              </span>
            ))}
            {filters.labels.map(l => (
              <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 20, border: '0.5px solid #2563eb', color: '#2563eb', background: 'rgba(37,99,235,0.08)' }}>
                {LABEL_DISPLAY[l]}
                <button onClick={() => setFilters(f => ({ ...f, labels: f.labels.filter(x => x !== l) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Issue list / board */}
      {filtered.length === 0 ? (
        <div style={{ padding: '80px 32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
          {hasFilters ? 'No issues match your filters.' : 'No issues'}
        </div>
      ) : display.viewMode === 'board' ? (
        <div style={{ overflowX: 'auto', height: 'calc(100vh - 140px)' }}>
          <KanbanBoard issues={filtered} groupBy={display.groupBy === 'none' ? 'status' : display.groupBy} displayProps={display.props} />
        </div>
      ) : display.groupBy === 'status' ? (
        STATUSES.map(s => {
          if (!display.showEmptyGroups && grouped[s].length === 0) return null
          return <StatusGroup key={s} status={s} issues={grouped[s]} defaultOpen={!['done', 'cancelled'].includes(s)} displayProps={display.props} />
        })
      ) : display.groupBy === 'priority' ? (
        ['urgent', 'high', 'medium', 'low', ''].map(p => {
          const group = filtered.filter(i => (i.priority ?? '') === p)
          if (!display.showEmptyGroups && group.length === 0) return null
          if (group.length === 0) return null
          const label = p ? p.charAt(0).toUpperCase() + p.slice(1) : 'No priority'
          return (
            <div key={p || 'none'}>
              <div style={{ display: 'flex', alignItems: 'center', height: 34, padding: '0 16px', borderBottom: '0.5px solid var(--border)', gap: 8 }}>
                <PriorityIndicator priority={p || null} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{group.length}</span>
              </div>
              {group.map(issue => <IssueRow key={issue.id} issue={issue} displayProps={display.props} />)}
            </div>
          )
        })
      ) : (
        filtered.map(issue => <IssueRow key={issue.id} issue={issue} displayProps={display.props} />)
      )}
    </div>
  )
}
