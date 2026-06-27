'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { respondToProposal } from './actions'

export type Proposal = {
  id: string
  action_ref: string | null
  action_type: 'approval' | 'question' | 'manual_action'
  action_summary: string | null
  draft_content: string | null
  question_text: string | null
  question_options: string[] | null
  estimated_minutes: number | null
  status: string
  created_at: string
  issues: {
    id: string
    number: number | null
    title: string
    status: string
    priority: string | null
    label: string | null
    pm_event_id: string | null
    pm_events: { id: string; name: string; date?: string | null } | null
  } | null
  agents?: { id: string; name: string; slug: string } | null
}

function issueRef(issue: Proposal['issues']) {
  if (!issue) return ''
  return issue.number ? `WSE-${issue.number}` : `WSE-${issue.id.slice(0, 4).toUpperCase()}`
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── Type badge ────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: Proposal['action_type'] }) {
  const config = {
    approval: {
      label: 'APPROVAL',
      color: '#7aa9ff',
      bg: 'rgba(122,169,255,0.12)',
      icon: (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
          <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M3.5 6l2 2 3-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    question: {
      label: 'QUESTION',
      color: '#d4ff4f',
      bg: 'rgba(212,255,79,0.1)',
      icon: (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M4.5 4.5a1.5 1.5 0 112.3 1.3C6.3 6.2 6 6.6 6 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <circle cx="6" cy="9" r=".6" fill="currentColor"/>
        </svg>
      ),
    },
    manual_action: {
      label: 'MANUAL ACTION',
      color: '#ffb27a',
      bg: 'rgba(255,178,122,0.1)',
      icon: (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M6 1v4M3 3.5L6 1l3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 6.5c0 2.5 1.8 4.5 4 4.5s4-2 4-4.5V5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      ),
    },
  }
  const c = config[type]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
      color: c.color, background: c.bg,
      padding: '2px 8px', borderRadius: 6,
    }}>
      {c.icon}{c.label}
    </span>
  )
}

// ── Approval card ─────────────────────────────────────────────────────────────

function ApprovalCard({ proposal, onDetail }: { proposal: Proposal; onDetail: () => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [comment, setComment] = useState('')
  const ref = issueRef(proposal.issues)

  function act(action: 'approved' | 'declined') {
    startTransition(async () => {
      await respondToProposal(proposal.id, action, comment || undefined)
      router.refresh()
    })
  }

  // Count proposals for same issue this round (simplified — just show ref count)
  return (
    <div
      onClick={onDetail}
      style={{
        background: 'var(--bg-secondary)',
        border: '0.5px solid var(--border)',
        borderRadius: 10, padding: '14px 16px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <TypeBadge type="approval" />
        {proposal.action_ref && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {proposal.action_ref}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{ref}</span>
        <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
          {proposal.issues?.title ?? 'Untitled'}
        </span>
      </div>

      {proposal.action_summary && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Proposed — </span>
          {proposal.action_summary}
        </div>
      )}

      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => act('approved')}
          style={{
            background: '#22e07a', color: '#0a3a1f',
            border: 'none', fontSize: 13, fontWeight: 500,
            padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)',
            flexShrink: 0,
          }}
        >
          Approve
        </button>
        <button
          onClick={() => act('declined')}
          style={{
            background: 'transparent', color: '#ff5470',
            border: '0.5px solid #5a2530',
            fontSize: 13, padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)',
            flexShrink: 0,
          }}
        >
          Decline
        </button>
        <input
          type="text"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Add a comment..."
          style={{
            flex: 1, fontSize: 13, padding: '6px 10px',
            border: '0.5px solid var(--border)',
            borderRadius: 7, background: 'transparent',
            color: 'var(--text)', fontFamily: 'var(--font)',
          }}
        />
      </div>
    </div>
  )
}

// ── Question card ─────────────────────────────────────────────────────────────

function QuestionCard({ proposal }: { proposal: Proposal }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [selected, setSelected] = useState<string | null>(null)
  const [custom, setCustom] = useState('')
  const ref = issueRef(proposal.issues)

  function submit(answer: string) {
    if (!answer.trim()) return
    startTransition(async () => {
      await respondToProposal(proposal.id, 'answered', answer)
      router.refresh()
    })
  }

  const answer = selected ?? custom

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '0.5px solid var(--border)',
      borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <TypeBadge type="question" />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{ref}</span>
        <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
          {proposal.question_text ?? proposal.issues?.title ?? 'Untitled question'}
        </span>
      </div>

      {proposal.question_options && proposal.question_options.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {proposal.question_options.map((opt: string) => (
            <button
              key={opt}
              onClick={() => { setSelected(opt === selected ? null : opt); setCustom('') }}
              style={{
                background: selected === opt ? 'var(--bg)' : 'var(--bg-secondary)',
                color: selected === opt ? 'var(--text)' : 'var(--text-secondary)',
                border: `0.5px solid ${selected === opt ? 'var(--border-hover)' : 'var(--border)'}`,
                fontSize: 13, padding: '6px 14px', borderRadius: 16,
                cursor: 'pointer', fontFamily: 'var(--font)',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          value={custom}
          onChange={e => { setCustom(e.target.value); setSelected(null) }}
          placeholder={proposal.question_options?.length ? 'Or type your own answer...' : 'Type your answer...'}
          style={{
            flex: 1, fontSize: 13, padding: '6px 10px',
            border: '0.5px solid var(--border)',
            borderRadius: 7, background: 'transparent',
            color: 'var(--text)', fontFamily: 'var(--font)',
          }}
          onKeyDown={e => { if (e.key === 'Enter') submit(answer) }}
        />
        <button
          onClick={() => submit(answer)}
          disabled={!answer.trim()}
          style={{
            background: '#22e07a', color: '#0a3a1f',
            border: 'none', fontSize: 13, fontWeight: 500,
            padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)',
            opacity: answer.trim() ? 1 : 0.5,
          }}
        >
          Submit
        </button>
      </div>
    </div>
  )
}

// ── Manual action card ────────────────────────────────────────────────────────

function ManualActionCard({ proposal, onOpen }: { proposal: Proposal; onOpen: () => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const ref = issueRef(proposal.issues)

  function act(action: 'done' | 'reassigned') {
    startTransition(async () => {
      await respondToProposal(proposal.id, action)
      router.refresh()
    })
  }

  return (
    <div
      onClick={onOpen}
      style={{
        background: 'var(--bg-secondary)',
        border: '0.5px solid var(--border)',
        borderRadius: 10, padding: '14px 16px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <TypeBadge type="manual_action" />
        {proposal.estimated_minutes && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            ~{proposal.estimated_minutes} min
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{ref}</span>
        <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
          {proposal.issues?.title ?? 'Untitled'}
        </span>
      </div>

      {proposal.action_summary && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          {proposal.action_summary}
        </div>
      )}

      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => act('done')}
          style={{
            background: '#22e07a', color: '#0a3a1f',
            border: 'none', fontSize: 13, fontWeight: 500,
            padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)',
          }}
        >
          Done
        </button>
        <button
          onClick={() => act('reassigned')}
          style={{
            background: 'transparent', color: 'var(--text-secondary)',
            border: '0.5px solid var(--border)',
            fontSize: 13, padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)',
          }}
        >
          Please execute yourself
        </button>
      </div>
    </div>
  )
}

// ── Approval detail panel ─────────────────────────────────────────────────────

function ApprovalDetailPanel({ proposal, onClose }: { proposal: Proposal; onClose: () => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [comment, setComment] = useState('')
  const issue = proposal.issues
  const ref = issueRef(issue)

  function act(action: 'approved' | 'declined') {
    startTransition(async () => {
      await respondToProposal(proposal.id, action, comment || undefined)
      router.refresh()
      onClose()
    })
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)', borderRadius: 12,
          border: '0.5px solid var(--border)',
          width: '90vw', maxWidth: 860,
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, flexShrink: 0 }}>
                {proposal.action_ref ?? ref}
              </span>
              <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {issue?.title ?? 'Untitled'}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, marginLeft: 16, flexShrink: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Property pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {issue?.status && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: 'var(--text-secondary)',
                border: '0.5px solid var(--border)', padding: '3px 8px', borderRadius: 6,
              }}>
                {issue.status.replace('_', ' ')}
              </span>
            )}
            {issue?.priority && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: 'var(--text-secondary)',
                border: '0.5px solid var(--border)', padding: '3px 8px', borderRadius: 6,
              }}>
                {issue.priority}
              </span>
            )}
            {issue?.pm_events && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: 'var(--text-secondary)',
                border: '0.5px solid var(--border)', padding: '3px 8px', borderRadius: 6,
              }}>
                {issue.pm_events.name}
                {issue.pm_events.date ? ` · ${formatDate(issue.pm_events.date)}` : ''}
              </span>
            )}
            {issue?.label && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: 'var(--text-secondary)',
                border: '0.5px solid var(--border)', padding: '3px 8px', borderRadius: 6,
              }}>
                {issue.label.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Two-pane body */}
        <div style={{
          flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden',
        }}>
          {/* Left: original issue */}
          <div style={{
            flex: 1, padding: '24px 26px', overflowY: 'auto',
            borderRight: '0.5px solid var(--border)',
          }}>
            <div style={{
              fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500,
              letterSpacing: '0.04em', marginBottom: 10,
            }}>ORIGINAL ISSUE</div>
            <div style={{
              fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
              borderLeft: '2px solid var(--border)',
              paddingLeft: 14,
            }}>
              {/* Description or title as fallback */}
              {issue?.title}
            </div>
          </div>

          {/* Right: proposed action + comment + buttons */}
          <div style={{
            flex: 1, padding: '24px 26px', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{
              background: 'linear-gradient(180deg, rgba(34,224,122,0.06), rgba(34,224,122,0.03))',
              border: '0.5px solid rgba(34,224,122,0.2)',
              borderLeft: '3px solid #22e07a',
              borderRadius: 10, padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M7 1l1.5 3.5L12 5l-2.5 2.5.5 3.5L7 9.5 4 11l.5-3.5L2 5l3.5-.5L7 1z"
                    stroke="#6fe0a0" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 11, color: '#6fe0a0', fontWeight: 600, letterSpacing: '0.04em' }}>
                  PROPOSED ACTION
                </span>
              </div>

              {proposal.action_summary && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
                  {proposal.action_summary}
                </div>
              )}

              {proposal.draft_content && (
                <div style={{
                  background: 'rgba(34,224,122,0.05)',
                  border: '0.5px solid rgba(34,224,122,0.15)',
                  borderRadius: 8, padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>DRAFT</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {proposal.draft_content}
                  </div>
                </div>
              )}
            </div>

            {/* Comment + action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => act('approved')}
                style={{
                  background: '#22e07a', color: '#0a3a1f',
                  border: 'none', fontSize: 13, fontWeight: 500,
                  padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0,
                }}
              >
                Approve
              </button>
              <button
                onClick={() => act('declined')}
                style={{
                  background: 'transparent', color: '#ff5470',
                  border: '0.5px solid #5a2530',
                  fontSize: 13, padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0,
                }}
              >
                Decline
              </button>
              <input
                type="text"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add comment"
                style={{
                  flex: 1,
                  fontSize: 13, padding: '7px 16px',
                  border: '0.5px solid var(--border)', borderRadius: 7,
                  background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Manual action detail panel ────────────────────────────────────────────────

function ManualActionDetailPanel({ proposal, onClose }: { proposal: Proposal; onClose: () => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const issue = proposal.issues

  function act(action: 'done' | 'reassigned') {
    startTransition(async () => {
      await respondToProposal(proposal.id, action)
      router.refresh()
      onClose()
    })
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)', borderRadius: 12,
          border: '0.5px solid var(--border)',
          width: '90vw', maxWidth: 600,
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginRight: 8 }}>
              {issueRef(issue)}
            </span>
            <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500 }}>
              {issue?.title ?? 'Untitled'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body — scrollable, can be used for live context */}
        <div style={{ flex: 1, padding: '24px 26px', overflowY: 'auto' }}>
          <div style={{
            fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500,
            letterSpacing: '0.04em', marginBottom: 10,
          }}>WHAT TO DO</div>
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, marginBottom: 16 }}>
            {proposal.action_summary ?? issue?.title}
          </div>
          {proposal.estimated_minutes && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Estimated time: ~{proposal.estimated_minutes} min
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 24px', borderTop: '0.5px solid var(--border)', display: 'flex', gap: 8 }}>
          <button
            onClick={() => act('done')}
            style={{
              background: '#22e07a', color: '#0a3a1f',
              border: 'none', fontSize: 13, fontWeight: 500,
              padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)',
            }}
          >
            Done
          </button>
          <button
            onClick={() => act('reassigned')}
            style={{
              background: 'transparent', color: 'var(--text-secondary)',
              border: '0.5px solid var(--border)',
              fontSize: 13, padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)',
            }}
          >
            Please execute yourself
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Filter panel ──────────────────────────────────────────────────────────────

type ActionType = Proposal['action_type']

function FilterPanel({ types, onChangeTypes, onClose }: {
  types: ActionType[]
  onChangeTypes: (v: ActionType[]) => void
  onClose: () => void
}) {
  function toggle(val: ActionType) {
    onChangeTypes(types.includes(val) ? types.filter(x => x !== val) : [...types, val])
  }
  const options: { value: ActionType; label: string }[] = [
    { value: 'approval', label: 'Approvals' },
    { value: 'question', label: 'Questions' },
    { value: 'manual_action', label: 'Manual actions' },
  ]
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={onClose} />
      <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 200, background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 8, minWidth: 200, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', paddingBottom: 6, marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 6px', borderBottom: '0.5px solid var(--border)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Filter</span>
          {types.length > 0 && <button onClick={() => onChangeTypes([])} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear all</button>}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', padding: '8px 12px 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</div>
        {options.map(o => (
          <button key={o.value} onClick={() => toggle(o.value)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 12px', border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${types.includes(o.value) ? '#2563eb' : 'var(--border-hover)'}`, background: types.includes(o.value) ? '#2563eb' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {types.includes(o.value) && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            {o.label}
          </button>
        ))}
      </div>
    </>
  )
}

// ── Sort panel ────────────────────────────────────────────────────────────────

type SortOrder = 'newest' | 'oldest' | 'type'

function SortPanel({ sort, onSort, onClose }: { sort: SortOrder; onSort: (s: SortOrder) => void; onClose: () => void }) {
  const options: { value: SortOrder; label: string }[] = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'type', label: 'By type' },
  ]
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={onClose} />
      <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 200, background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 8, minWidth: 180, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', paddingBottom: 6, marginTop: 4 }}>
        <div style={{ padding: '10px 12px 6px', borderBottom: '0.5px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Sort</div>
        {options.map(o => (
          <button key={o.value} onClick={() => { onSort(o.value); onClose() }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 12px', border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {o.label}
            {sort === o.value && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
        ))}
      </div>
    </>
  )
}

const TYPE_ORDER: Record<ActionType, number> = { approval: 0, question: 1, manual_action: 2 }

// ── Main queue ────────────────────────────────────────────────────────────────

export default function NeedsYouClient({ proposals }: { proposals: Proposal[] }) {
  const [detailProposal, setDetailProposal] = useState<Proposal | null>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [filterTypes, setFilterTypes] = useState<ActionType[]>([])
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  const hasFilter = filterTypes.length > 0
  const hasSort = sortOrder !== 'newest'

  let displayed = proposals.filter(p => filterTypes.length === 0 || filterTypes.includes(p.action_type))
  if (sortOrder === 'oldest') displayed = [...displayed].reverse()
  if (sortOrder === 'type') displayed = [...displayed].sort((a, b) => TYPE_ORDER[a.action_type] - TYPE_ORDER[b.action_type])

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0, flex: 1 }}>
          Needs you
          {displayed.length !== proposals.length && (
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 8 }}>
              {displayed.length}/{proposals.length}
            </span>
          )}
          {displayed.length === proposals.length && proposals.length > 0 && (
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 8 }}>
              {proposals.length} open
            </span>
          )}
        </h1>

        {/* Filter icon */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowFilter(o => !o); setShowSort(false) }}
            style={{ background: hasFilter ? 'rgba(37,99,235,0.1)' : 'none', border: 'none', cursor: 'pointer', color: hasFilter ? '#2563eb' : 'var(--text-tertiary)', display: 'flex', padding: 5, borderRadius: 5, position: 'relative' }}
            onMouseEnter={e => { if (!hasFilter) e.currentTarget.style.background = 'var(--bg-secondary)' }}
            onMouseLeave={e => { if (!hasFilter) e.currentTarget.style.background = 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            {hasFilter && <span style={{ position: 'absolute', top: 2, right: 2, width: 5, height: 5, borderRadius: '50%', background: '#2563eb' }} />}
          </button>
          {showFilter && <FilterPanel types={filterTypes} onChangeTypes={setFilterTypes} onClose={() => setShowFilter(false)} />}
        </div>

        {/* Sort icon */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowSort(o => !o); setShowFilter(false) }}
            style={{ background: hasSort ? 'rgba(37,99,235,0.1)' : 'none', border: 'none', cursor: 'pointer', color: hasSort ? '#2563eb' : 'var(--text-tertiary)', display: 'flex', padding: 5, borderRadius: 5 }}
            onMouseEnter={e => { if (!hasSort) e.currentTarget.style.background = 'var(--bg-secondary)' }}
            onMouseLeave={e => { if (!hasSort) e.currentTarget.style.background = 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="4" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 7h1M5.5 7h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="10" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 4h7M11.5 4h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="6" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 10h3M7.5 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
          {showSort && <SortPanel sort={sortOrder} onSort={setSortOrder} onClose={() => setShowSort(false)} />}
        </div>
      </div>

      {/* Card list */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
          {proposals.length === 0 ? 'Nothing needs your attention right now.' : 'No items match the current filter.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map(p => {
            if (p.action_type === 'approval') {
              return (
                <ApprovalCard
                  key={p.id}
                  proposal={p}
                  onDetail={() => setDetailProposal(p)}
                />
              )
            }
            if (p.action_type === 'question') {
              return <QuestionCard key={p.id} proposal={p} />
            }
            if (p.action_type === 'manual_action') {
              return (
                <ManualActionCard
                  key={p.id}
                  proposal={p}
                  onOpen={() => setDetailProposal(p)}
                />
              )
            }
            return null
          })}
        </div>
      )}

      {/* Detail panels */}
      {detailProposal && detailProposal.action_type === 'approval' && (
        <ApprovalDetailPanel proposal={detailProposal} onClose={() => setDetailProposal(null)} />
      )}
      {detailProposal && detailProposal.action_type === 'manual_action' && (
        <ManualActionDetailPanel proposal={detailProposal} onClose={() => setDetailProposal(null)} />
      )}
    </div>
  )
}
