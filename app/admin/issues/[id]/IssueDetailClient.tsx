'use client'

import React, { useState, useTransition } from 'react'
import { updateIssue, createIssue, deleteIssue } from '../actions'
import { useRouter } from 'next/navigation'
import { StatusCircle, STATUSES, STATUS_LABELS, STATUS_COLORS, LABELS, LABEL_DISPLAY } from '../IssuesClient'
import type { Issue } from '../IssuesClient'

function issueId(issue: Issue) {
  return issue.number ? `WSE-${issue.number}` : `WSE-${issue.id.slice(0, 4).toUpperCase()}`
}

// Inline dropdown — appears when clicking a property row
function PropDropdown({ options, value, onChange, onClose }: {
  options: { value: string; label: string; icon?: React.ReactNode }[]
  value: string
  onChange: (v: string) => void
  onClose: () => void
}) {
  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 100,
      background: 'var(--bg)', border: '0.5px solid var(--border)',
      borderRadius: 8, padding: 4, minWidth: 160,
      boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
    }}>
      {options.map(opt => (
        <button key={opt.value} onClick={() => { onChange(opt.value); onClose() }} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '6px 10px', borderRadius: 5, border: 'none',
          background: opt.value === value ? 'var(--bg-secondary)' : 'transparent',
          color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font)',
          textAlign: 'left',
        }}>
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function PropertyRow({ label, value, icon, options, onChange }: {
  label: string
  value: string
  icon?: React.ReactNode
  options: { value: string; label: string; icon?: React.ReactNode }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 0', cursor: 'pointer', borderRadius: 5,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {icon}
        <span style={{ fontSize: 13, color: value ? 'var(--text)' : 'var(--text-tertiary)' }}>{value || label}</span>
      </div>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <PropDropdown options={options} value={value} onChange={onChange} onClose={() => setOpen(false)} />
        </>
      )}
    </div>
  )
}

function PropSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', padding: '8px 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
        {title}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5 }}>
          <path d="M3 4l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {children}
    </div>
  )
}

export default function IssueDetailClient({
  issue, subIssues, pmEvents,
}: {
  issue: Issue & { pm_events: { id: string; name: string } | null }
  subIssues: Issue[]
  pmEvents: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(issue.description ?? '')
  const [status, setStatus] = useState(issue.status)
  const [priority, setPriority] = useState(issue.priority ?? '')
  const [label, setLabel] = useState(issue.label ?? '')
  const [pmEventId, setPmEventId] = useState(issue.pm_event_id ?? '')
  const [addingSubIssue, setAddingSubIssue] = useState(false)
  const [subIssueTitle, setSubIssueTitle] = useState('')

  function save(fields: Record<string, unknown>) {
    startTransition(async () => {
      await updateIssue(issue.id, fields)
      router.refresh()
    })
  }

  async function handleAddSubIssue() {
    if (!subIssueTitle.trim()) return
    await createIssue({ title: subIssueTitle.trim(), status: 'todo', parent_issue_id: issue.id, source: 'manual' })
    setSubIssueTitle('')
    setAddingSubIssue(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Delete this issue?')) return
    await deleteIssue(issue.id)
    router.push('/admin/issues')
  }

  const statusOptions = STATUSES.map(s => ({
    value: s,
    label: STATUS_LABELS[s],
    icon: <StatusCircle status={s} size={14} />,
  }))

  const priorityOptions = [
    { value: '', label: 'No priority' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]

  const labelOptions = [
    { value: '', label: 'No label' },
    ...LABELS.map(l => ({ value: l, label: LABEL_DISPLAY[l] })),
  ]

  const eventOptions = [
    { value: '', label: 'No event' },
    ...pmEvents.map(e => ({ value: e.id, label: e.name })),
  ]

  const currentStatus = STATUS_LABELS[status] ?? status
  const currentPriority = priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : ''
  const currentLabel = label ? LABEL_DISPLAY[label] : ''
  const currentEvent = pmEventId ? (pmEvents.find(e => e.id === pmEventId)?.name ?? '') : ''

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', fontFamily: 'var(--font)', overflow: 'hidden' }}>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px 48px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, fontSize: 12, color: 'var(--text-tertiary)' }}>
          <a href="/admin/issues" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Issues</a>
          <span>›</span>
          <span>{issueId(issue)}</span>
          {issue.parent_issue_id && <span> (sub-issue)</span>}
        </div>

        {/* Title */}
        <textarea
          value={title}
          onChange={e => {
            setTitle(e.target.value)
            e.currentTarget.style.height = 'auto'
            e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'
          }}
          onBlur={() => { if (title !== issue.title) save({ title }) }}
          rows={1}
          style={{
            width: '100%', fontSize: 22, fontWeight: 600, lineHeight: 1.35,
            border: 'none', background: 'transparent', color: 'var(--text)',
            outline: 'none', resize: 'none', fontFamily: 'var(--font)',
            marginBottom: 12, overflow: 'hidden', display: 'block',
          }}
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => { if (description !== (issue.description ?? '')) save({ description }) }}
          placeholder="Add description..."
          rows={5}
          style={{
            width: '100%', fontSize: 14, lineHeight: 1.6,
            border: 'none', background: 'transparent',
            color: description ? 'var(--text)' : 'var(--text-tertiary)',
            outline: 'none', resize: 'none', fontFamily: 'var(--font)', marginBottom: 24,
          }}
        />

        {/* Sub-issues */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Sub-issues {subIssues.length > 0 && <span style={{ color: 'var(--text-tertiary)' }}>({subIssues.length})</span>}
          </div>

          {subIssues.map(sub => (
            <a key={sub.id} href={`/admin/issues/${sub.id}`} style={{
              display: 'flex', alignItems: 'center', gap: 8, height: 32,
              textDecoration: 'none', color: 'var(--text)',
              borderBottom: '0.5px solid var(--border)',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <StatusCircle status={sub.status} size={13} />
              <span style={{ fontSize: 13 }}>{sub.title}</span>
            </a>
          ))}

          {addingSubIssue ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                autoFocus
                value={subIssueTitle}
                onChange={e => setSubIssueTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddSubIssue(); if (e.key === 'Escape') { setAddingSubIssue(false); setSubIssueTitle('') } }}
                placeholder="Sub-issue title"
                style={{
                  flex: 1, padding: '6px 10px', fontSize: 13, borderRadius: 6,
                  border: '0.5px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)',
                }}
              />
              <button onClick={handleAddSubIssue} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 13, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>Add</button>
              <button onClick={() => { setAddingSubIssue(false); setSubIssueTitle('') }} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 13, background: 'none', border: '0.5px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setAddingSubIssue(true)} style={{
              marginTop: 8, fontSize: 13, background: 'none', border: 'none',
              color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0',
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              Add sub-issues
            </button>
          )}
        </div>

        {/* Delete */}
        <button onClick={handleDelete} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Delete issue
        </button>
      </div>

      {/* Properties panel */}
      <div style={{
        width: 240, flexShrink: 0,
        borderLeft: '0.5px solid var(--border)',
        padding: '20px 16px',
        overflowY: 'auto',
        background: 'var(--bg)',
      }}>
        <PropSection title="Properties">
          <PropertyRow
            label="Status"
            value={currentStatus}
            icon={<StatusCircle status={status} size={14} />}
            options={statusOptions}
            onChange={v => { setStatus(v); save({ status: v }) }}
          />
          <PropertyRow
            label="Set priority"
            value={currentPriority}
            icon={
              <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
                <path d="M2 9h2M2 6h2M2 3h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M6 9h4M6 6h4M6 3h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            }
            options={priorityOptions}
            onChange={v => { setPriority(v); save({ priority: v || null }) }}
          />
          <PropertyRow
            label="Assign"
            value=""
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="5" r="2.5" stroke="var(--text-tertiary)" strokeWidth="1.2"/>
                <path d="M2 13c0-2.76 2.24-4 5-4s5 1.24 5 4" stroke="var(--text-tertiary)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            }
            options={[{ value: '', label: 'Unassigned' }]}
            onChange={() => {}}
          />
        </PropSection>

        <PropSection title="Labels">
          <PropertyRow
            label="Add label"
            value={currentLabel}
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <path d="M1.5 1.5h5l6 6a1 1 0 010 1.41l-3.59 3.59a1 1 0 01-1.41 0l-6-6V1.5z" stroke="var(--text-tertiary)" strokeWidth="1.2"/>
                <circle cx="4.5" cy="4.5" r="1" fill="var(--text-tertiary)"/>
              </svg>
            }
            options={labelOptions}
            onChange={v => { setLabel(v); save({ label: v || null }) }}
          />
        </PropSection>

        <PropSection title="Event">
          <PropertyRow
            label="Add to event"
            value={currentEvent}
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5.5" stroke="var(--text-tertiary)" strokeWidth="1.2"/>
              </svg>
            }
            options={eventOptions}
            onChange={v => { setPmEventId(v); save({ pm_event_id: v || null }) }}
          />
        </PropSection>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--border)', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
          <div>Created {new Date(issue.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div>Updated {new Date(issue.updated_at ?? issue.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>
    </div>
  )
}
