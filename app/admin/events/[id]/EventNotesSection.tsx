'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addEventNote } from '../actions'
import DateInput from '@/app/components/DateInput'

type Note = { id: string; body: string; note_date: string }

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const fieldStyle: React.CSSProperties = {
  fontSize: 13,
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--bg)', color: 'var(--text)',
  fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
}

export default function EventNotesSection({ eventId, notes }: { eventId: string; notes: Note[] }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [date, setDate] = useState(today())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, startTransition] = useTransition()
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Grow the textarea to fit its content (single line at rest, expands on paste).
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 34)}px`
  }, [text])

  function handleSubmit() {
    if (!text.trim()) return
    startTransition(async () => {
      await addEventNote(eventId, text, date || today())
      setText('')
      setDate(today())
      router.refresh()
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: notes.length > 0 ? 14 : 0, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <DateInput
          value={date}
          onChange={setDate}
          style={{ ...fieldStyle, width: 150, height: 34, padding: '0 12px' }}
        />
        <textarea
          ref={taRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
          placeholder="Add a note — paste a set list, or what changed / was agreed by email"
          rows={1}
          style={{
            ...fieldStyle, flex: 1, minWidth: 200,
            padding: '7px 12px', lineHeight: 1.4, height: 34,
            resize: 'none', overflow: 'hidden',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={saving || !text.trim()}
          style={{
            height: 34, padding: '0 16px', fontSize: 13, fontWeight: 500,
            background: 'var(--text)', color: 'var(--bg)', border: 'none',
            borderRadius: 'var(--radius-sm)', cursor: saving || !text.trim() ? 'not-allowed' : 'pointer',
            opacity: saving || !text.trim() ? 0.5 : 1, fontFamily: 'var(--font)', whiteSpace: 'nowrap',
          }}
        >
          {saving ? 'Adding…' : 'Add note'}
        </button>
      </div>

      {notes.length > 0 && (
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {notes.map((n, i) => {
            const isOpen = expanded === n.id
            const firstLine = n.body.split('\n')[0]
            // "more" = more than one line, or a first line long enough that it's
            // likely being truncated by the ellipsis.
            const hasMore = n.body.trimEnd().length > firstLine.length || firstLine.length > 80
            return (
              <div
                key={n.id}
                onClick={() => hasMore && setExpanded(isOpen ? null : n.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '110px 1fr 22px', gap: '0 16px',
                  padding: '9px 14px', alignItems: 'start',
                  cursor: hasMore ? 'pointer' : 'default',
                  borderTop: i === 0 ? 'none' : '0.5px solid var(--border)',
                  background: isOpen ? 'var(--bg-secondary)' : 'transparent',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', paddingTop: 1 }}>
                  {formatDate(n.note_date)}
                </div>
                <div
                  style={{
                    fontSize: 13, color: 'var(--text)', lineHeight: 1.5,
                    ...(isOpen
                      ? { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
                      : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
                  }}
                >
                  {isOpen ? n.body : firstLine}
                </div>
                {hasMore ? (
                  <span
                    aria-hidden
                    style={{
                      justifySelf: 'end', marginTop: 1, fontSize: 10, lineHeight: '18px',
                      width: 18, height: 18, textAlign: 'center',
                      borderRadius: 5, background: 'var(--bg-secondary)',
                      border: '0.5px solid var(--border)', color: 'var(--text-secondary)',
                      transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.12s',
                    }}
                  >
                    ▸
                  </span>
                ) : (
                  <span />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
