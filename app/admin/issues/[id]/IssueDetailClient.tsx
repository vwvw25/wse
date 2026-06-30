'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { updateIssue, createIssue, deleteIssue } from '../actions'
import { postIssueMessage } from './actions'
import type { IssueMessage } from './actions'
import { useRouter } from 'next/navigation'
import { StatusCircle, STATUSES, STATUS_LABELS, STATUS_COLORS, LABELS, LABEL_DISPLAY, LABEL_COLORS } from '../IssuesClient'
import type { Issue } from '../IssuesClient'

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

function PropDropdown({ options, value, onChange, onClose }: {
  options: { value: string; label: string; icon?: React.ReactNode }[]
  value: string
  onChange: (v: string) => void
  onClose: () => void
}) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={onClose} />
      <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 4, minWidth: 160, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', marginTop: 4 }}>
        {options.map(opt => (
          <button key={opt.value} onClick={() => { onChange(opt.value); onClose() }} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '6px 10px', borderRadius: 5, border: 'none',
            background: opt.value === value ? 'var(--bg-secondary)' : 'transparent',
            color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font)', textAlign: 'left',
          }}>
            {opt.icon}{opt.label}
          </button>
        ))}
      </div>
    </>
  )
}

function EditablePropPill({ label, icon, options, value, onChange }: {
  label: string
  icon?: React.ReactNode
  options: { value: string; label: string; icon?: React.ReactNode }[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <PropPill label={label} icon={icon} onClick={() => setOpen(o => !o)} />
      {open && <PropDropdown options={options} value={value} onChange={onChange} onClose={() => setOpen(false)} />}
    </div>
  )
}

export default function IssueDetailClient({
  issue, subIssues, pmEvents, agents, messages, onDelete, onRefreshSubIssues, onMessagePosted,
}: {
  issue: Issue & { pm_events: { id: string; name: string } | null }
  subIssues: Issue[]
  pmEvents: { id: string; name: string }[]
  agents: { id: string; name: string; slug: string }[]
  messages: IssueMessage[]
  onDelete?: () => void
  onRefreshSubIssues?: () => void
  onMessagePosted?: () => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(issue.description ?? '')
  const [status, setStatus] = useState(issue.status)
  const [priority, setPriority] = useState(issue.priority ?? '')
  const [labels, setLabels] = useState<string[]>(issue.labels ?? [])
  const [pmEventId, setPmEventId] = useState(issue.pm_event_id ?? '')
  const [assignedAgentId, setAssignedAgentId] = useState(issue.assigned_agent_id ?? '')
  const [showLabelAdd, setShowLabelAdd] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [comment, setComment] = useState('')

  useEffect(() => {
    setTitle(issue.title)
    setDescription(issue.description ?? '')
    setStatus(issue.status)
    setPriority(issue.priority ?? '')
    setLabels(issue.labels ?? [])
    setPmEventId(issue.pm_event_id ?? '')
    setAssignedAgentId(issue.assigned_agent_id ?? '')
  }, [issue.id])

  function save(fields: Record<string, unknown>) {
    startTransition(async () => { await updateIssue(issue.id, fields); router.refresh() })
  }

  async function handleAddTask() {
    if (!taskTitle.trim()) return
    await createIssue({ title: taskTitle.trim(), status: 'todo', parent_issue_id: issue.id, source: 'manual' })
    setTaskTitle('')
    setAddingTask(false)
    router.refresh()
    onRefreshSubIssues?.()
  }

  async function handleDelete() {
    if (!confirm('Delete this issue?')) return
    await deleteIssue(issue.id)
    onDelete ? onDelete() : router.push('/admin/issues')
  }

  const statusOptions = STATUSES.map(s => ({
    value: s, label: STATUS_LABELS[s], icon: <StatusCircle status={s} size={13} />,
  }))

  const priorityOptions = [
    { value: '', label: 'No priority' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]

  const eventOptions = [
    { value: '', label: 'No event' },
    ...pmEvents.map(e => ({ value: e.id, label: e.name })),
  ]

  const assigneeOptions = [
    { value: '', label: 'Victoria' },
    ...agents.map(a => ({ value: a.id, label: a.name })),
  ]

  const currentStatusLabel = STATUS_LABELS[status] ?? status
  const currentPriorityLabel = priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Priority'
  const currentEventLabel = pmEventId ? (pmEvents.find(e => e.id === pmEventId)?.name ?? 'Event') : 'Event'
  const currentAssigneeLabel = assignedAgentId ? (agents.find(a => a.id === assignedAgentId)?.name ?? 'Unknown') : 'Victoria'

  function removeLabel(l: string) {
    const next = labels.filter(x => x !== l)
    setLabels(next)
    save({ labels: next.length ? next : null })
  }

  function addLabel(l: string) {
    if (labels.includes(l)) return
    const next = [...labels, l]
    setLabels(next)
    save({ labels: next })
    setShowLabelAdd(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: 'var(--font)' }}>

      {/* Top action bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 16px', height: 46, borderBottom: '0.5px solid var(--border)',
        flexShrink: 0, overflowX: 'auto',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{issueId(issue)}</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{issue.title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
          <button onClick={() => { setStatus('done'); save({ status: 'done' }) }} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 11px', borderRadius: 6, fontSize: 12,
            border: '0.5px solid #34d399', background: 'transparent',
            color: '#34d399', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Mark done
          </button>
          <button onClick={handleDelete} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 11px', borderRadius: 6, fontSize: 12,
            border: '0.5px solid var(--border)', background: 'transparent',
            color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 1h2M4.5 3v6.5M7.5 3v6.5M2 3l.5 7.5h7L10 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Delete
          </button>
        </div>
      </div>

      {/* Properties strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        padding: '8px 16px', borderBottom: '0.5px solid var(--border)',
        flexShrink: 0,
      }}>
        <EditablePropPill
          label={currentStatusLabel}
          icon={<StatusCircle status={status} size={12} />}
          options={statusOptions}
          value={status}
          onChange={v => { setStatus(v); save({ status: v }) }}
        />
        <EditablePropPill
          label={currentPriorityLabel}
          icon={<svg width="11" height="11" viewBox="0 0 11 11"><rect x="1" y="6" width="2" height="4" rx="0.5" fill="currentColor" opacity="0.4"/><rect x="4.5" y="3.5" width="2" height="6.5" rx="0.5" fill="currentColor" opacity="0.4"/><rect x="8" y="1" width="2" height="9" rx="0.5" fill="currentColor" opacity="0.4"/></svg>}
          options={priorityOptions}
          value={priority}
          onChange={v => { setPriority(v); save({ priority: v || null }) }}
        />
        <EditablePropPill
          label={currentAssigneeLabel}
          icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 11c0-2.5 2.24-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
          options={assigneeOptions}
          value={assignedAgentId}
          onChange={v => { setAssignedAgentId(v); save({ assigned_agent_id: v || null }) }}
        />
        <EditablePropPill
          label={currentEventLabel}
          icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/></svg>}
          options={eventOptions}
          value={pmEventId}
          onChange={v => { setPmEventId(v); save({ pm_event_id: v || null }) }}
        />

        {/* Individual label pills */}
        {labels.map(l => {
          const lc = LABEL_COLORS[l] ?? LABEL_COLORS['other']
          return (
            <span key={l} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px 3px 9px', borderRadius: 20, fontSize: 11,
              background: lc.bg, color: lc.color, border: `0.5px solid ${lc.border}`,
              whiteSpace: 'nowrap',
            }}>
              {LABEL_DISPLAY[l] ?? l}
              <button onClick={() => removeLabel(l)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer',
                color: lc.color, padding: 0, lineHeight: 1, opacity: 0.7, fontSize: 13,
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
              >×</button>
            </span>
          )
        })}

        {/* Add label button */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowLabelAdd(o => !o)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 6, fontSize: 11,
            border: '0.5px dashed var(--border)', background: 'transparent',
            color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'var(--font)',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Label
          </button>
          {showLabelAdd && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setShowLabelAdd(false)} />
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 300, background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 8, minWidth: 200, boxShadow: '0 8px 30px rgba(0,0,0,0.4)', padding: '6px 0', marginTop: 4 }}>
                {LABELS.filter(l => !labels.includes(l)).map(l => {
                  const lc = LABEL_COLORS[l] ?? LABEL_COLORS['other']
                  return (
                    <button key={l} type="button" onClick={() => addLabel(l)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 12px', border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: lc.color, flexShrink: 0, display: 'inline-block' }} />
                      <span>{LABEL_DISPLAY[l] ?? l}</span>
                    </button>
                  )
                })}
                {LABELS.every(l => labels.includes(l)) && (
                  <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-tertiary)' }}>All labels applied</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        {/* Title */}
        <textarea
          value={title}
          onChange={e => { setTitle(e.target.value); e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px' }}
          onBlur={() => { if (title !== issue.title) save({ title }) }}
          rows={1}
          style={{ width: '100%', fontSize: 22, fontWeight: 600, lineHeight: 1.35, border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'var(--font)', marginBottom: 12, overflow: 'hidden', display: 'block', boxSizing: 'border-box' }}
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => { if (description !== (issue.description ?? '')) save({ description }) }}
          placeholder="Add description..."
          style={{ width: '100%', minHeight: 360, fontSize: 14, lineHeight: 1.6, border: '0.5px solid var(--border)', borderRadius: 6, padding: '12px 14px', background: 'transparent', color: description ? 'var(--text)' : 'var(--text-tertiary)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font)', marginBottom: 16, boxSizing: 'border-box' }}
        />

        {/* Toolbar */}
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

        {/* Tasks */}
        <button onClick={() => setAddingTask(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: addingTask || subIssues.length > 0 ? 12 : 28 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          Add task
        </button>

        {subIssues.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {subIssues.map(sub => (
              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32, borderBottom: '0.5px solid var(--border)', fontSize: 13, color: 'var(--text)' }}>
                <StatusCircle status={sub.status} size={13} />
                <span style={{ flex: 1 }}>{sub.title}</span>
              </div>
            ))}
          </div>
        )}

        {addingTask && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              autoFocus
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') { setAddingTask(false); setTaskTitle('') } }}
              placeholder="Task title"
              style={{ flex: 1, padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)' }}
            />
            <button onClick={handleAddTask} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 13, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>Add</button>
            <button onClick={() => { setAddingTask(false); setTaskTitle('') }} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 13, background: 'none', border: '0.5px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
          </div>
        )}

        {/* Chat thread */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 16 }}>Activity</span>

          {/* Created event */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-tertiary)' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>V</div>
            <span>Issue created · {timeAgo(issue.created_at)}</span>
          </div>

          {/* Messages */}
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: msg.role === 'agent' ? '#7c3aed' : '#16a34a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff',
              }}>
                {msg.role === 'agent' ? 'AI' : 'V'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                    {msg.role === 'agent' ? 'CEO' : 'Victoria'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{timeAgo(msg.created_at)}</span>
                </div>
                {msg.content && (
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Comment input */}
          <div style={{ border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
            <textarea
              placeholder="Leave a comment..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={async e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && comment.trim()) {
                  e.preventDefault()
                  await postIssueMessage(issue.id, comment)
                  setComment('')
                  onMessagePosted?.()
                }
              }}
              rows={3}
              style={{ width: '100%', padding: '12px 14px', fontSize: 13, border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '8px 12px', borderTop: '0.5px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginRight: 'auto' }}>⌘↵ to send</span>
              <button
                onClick={async () => {
                  if (!comment.trim()) return
                  await postIssueMessage(issue.id, comment)
                  setComment('')
                  onMessagePosted?.()
                }}
                style={{ background: '#2563eb', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#fff', fontSize: 12, fontFamily: 'var(--font)' }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
