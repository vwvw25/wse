'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { addEventComment } from '../actions'

type Comment = { id: string; summary: string | null; actor: string; changed_at: string }

function draftKey(eventId: string) {
  return `wse-comment-draft-${eventId}`
}

export default function CommentsSection({ eventId, comments }: { eventId: string; comments: Comment[] }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [saving, startTransition] = useTransition()
  const draftTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore an unsaved draft (e.g. from an accidental navigation away) on mount.
  // Must run in an effect, not during render — localStorage isn't available
  // during SSR, and reading it at render time would cause a hydration mismatch.
  useEffect(() => {
    const draft = window.localStorage.getItem(draftKey(eventId))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (draft) setText(draft)
  }, [eventId])

  function handleChange(value: string) {
    setText(value)
    if (draftTimeout.current) clearTimeout(draftTimeout.current)
    draftTimeout.current = setTimeout(() => {
      if (value.trim()) {
        window.localStorage.setItem(draftKey(eventId), value)
      } else {
        window.localStorage.removeItem(draftKey(eventId))
      }
    }, 400)
  }

  function handleSubmit() {
    if (!text.trim()) return
    startTransition(async () => {
      await addEventComment(eventId, text)
      setText('')
      window.localStorage.removeItem(draftKey(eventId))
      router.refresh()
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <textarea
          value={text}
          onChange={e => handleChange(e.target.value)}
          placeholder="Add a comment — e.g. why a field was changed, context from a call…"
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', fontSize: 13,
            border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', color: 'var(--text)',
            fontFamily: 'var(--font)', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
          }}
        />
        <div style={{ marginTop: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={saving || !text.trim()}
            style={{
              padding: '7px 16px', fontSize: 13, fontWeight: 500,
              background: 'var(--text)', color: 'var(--bg)', border: 'none',
              borderRadius: 'var(--radius-sm)', cursor: saving || !text.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !text.trim() ? 0.5 : 1, fontFamily: 'var(--font)',
            }}
          >
            {saving ? 'Adding…' : 'Add comment'}
          </button>
        </div>
      </div>

      {comments.length === 0 ? (
        <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>No comments yet.</div>
      ) : (
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '0 16px' }}>
          {comments.map((c, i) => (
            <div key={c.id} style={{
              padding: '12px 0',
              borderTop: i === 0 ? 'none' : '0.5px solid var(--border)',
            }}>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {c.summary}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                {c.actor} · {new Date(c.changed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' '}{new Date(c.changed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
