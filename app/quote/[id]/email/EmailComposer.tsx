'use client'

import React, { useState, useMemo } from 'react'
import type { EmailTemplate, EventRecord } from '@/types/quote'

interface Props {
  templates: EmailTemplate[]
  event: EventRecord | null
  quoteHtml: string
  quoteId: string
}

function fillTemplate(body: string, event: EventRecord | null, quoteHtml: string): string {
  const agentFirst = event?.agent_name?.split(' ')[0] ?? ''
  const eventDate = event?.event_date
    ? new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const replacements: Record<string, string> = {
    agent_first_name: agentFirst,
    agent_name: event?.agent_name ?? '',
    agency_name: event?.agency_name ?? '',
    event_date: eventDate,
    venue_name: event?.venue_name ?? '',
    location: event?.location ?? '',
    start_time: event?.start_time ?? '',
    finish_time: event?.finish_time ?? '',
    guests: event?.guests != null ? String(event.guests) : '',
    event_type: event?.event_type ?? '',
    name: agentFirst,
    date: eventDate,
    NAME: agentFirst,
    DATE: eventDate,
    quote: quoteHtml,
  }

  return body.replace(/\{\{([^}]+)\}\}/g, (match, field) => {
    const key = field.trim()
    return key in replacements ? replacements[key] : match
  })
}

function toDisplayHtml(body: string): string {
  // If plain text (old format), convert newlines to <br>
  if (/<[a-z][\s\S]*>/i.test(body)) return body
  return body.replace(/\n/g, '<br>')
}

export default function EmailComposer({ templates, event, quoteHtml, quoteId }: Props) {
  const [selected, setSelected] = useState<EmailTemplate | null>(templates[0] ?? null)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  const filledHtml = useMemo(() => {
    if (!selected) return ''
    return fillTemplate(toDisplayHtml(selected.body), event, quoteHtml)
  }, [selected, event, quoteHtml])

  const filledSubject = useMemo(() => {
    if (!selected?.subject) return ''
    return fillTemplate(selected.subject, event, quoteHtml)
  }, [selected, event, quoteHtml])

  async function handleCopy() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([filledHtml], { type: 'text/html' }) }),
      ])
    } catch {
      const tmp = document.createElement('div')
      tmp.innerHTML = filledHtml
      await navigator.clipboard.writeText(tmp.innerText)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', fontFamily: 'var(--font)', overflow: 'hidden' }}>

      {/* Left — template list */}
      <div style={{
        width: 240, flexShrink: 0, borderRight: '0.5px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '12px', borderBottom: '0.5px solid var(--border)' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            style={{
              width: '100%', height: 32, padding: '0 10px', fontSize: 13, boxSizing: 'border-box',
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              outline: 'none', fontFamily: 'var(--font)',
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--text-tertiary)' }}>No templates</div>
          ) : filtered.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t)}
              style={{
                padding: '10px 12px', cursor: 'pointer', borderBottom: '0.5px solid var(--border)',
                background: selected?.id === t.id ? 'var(--bg-info)' : 'transparent',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.name}</div>
              {t.subject && (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.subject}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right — preview */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            Select a template
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div style={{
              padding: '10px 24px', borderBottom: '0.5px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{selected.name}</div>
                {filledSubject && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Subject: {filledSubject}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={`/quote/${quoteId}`}
                  style={{
                    padding: '7px 14px', fontSize: 12, fontWeight: 500,
                    background: 'transparent', color: 'var(--text-secondary)',
                    border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                  }}
                >
                  ← Back
                </a>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '7px 18px', fontSize: 12, fontWeight: 500,
                    background: copied ? '#276749' : 'var(--accent)', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    fontFamily: 'var(--font)',
                  }}
                >
                  {copied ? 'Copied!' : 'Copy to clipboard'}
                </button>
              </div>
            </div>

            {/* Email preview */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
              <div
                style={{
                  maxWidth: 680, background: '#fff', border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: '32px 40px',
                  fontSize: 14, lineHeight: 1.7, color: '#111',
                  fontFamily: 'Georgia, serif',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
                dangerouslySetInnerHTML={{ __html: filledHtml }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
