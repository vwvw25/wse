'use client'

import React, { useState, useMemo } from 'react'
import type { EmailTemplate, EventRecord, WhySuitedTemplate } from '@/types/quote'
import { gmailBodyStyle } from '@/lib/email-style'

interface Props {
  templates: EmailTemplate[]
  whySuitedTemplates: WhySuitedTemplate[]
  whySuitedPrompt: string
  enquiryEmail: string
  event: EventRecord | null
  quoteHtml: string
  bookingDetailsHtml: string
  quoteId: string
}

// {{why_suited:<name>}} — a named blurb from Settings → Why we're suited.
const WHY_SUITED_RE = /\{\{\s*why_suited\s*:\s*([^}]+?)\s*\}\}/i
const WHY_SUITED_RE_G = /\{\{\s*why_suited\s*:\s*([^}]+?)\s*\}\}/gi

function findWhySuited(templates: WhySuitedTemplate[], name: string): WhySuitedTemplate | undefined {
  const target = name.trim().toLowerCase()
  return templates.find(t => t.name.trim().toLowerCase() === target)
}

function fillTemplate(
  body: string,
  event: EventRecord | null,
  quoteHtml: string,
  bookingDetailsHtml: string,
  whySuitedTemplates: WhySuitedTemplate[] = [],
): string {
  // Resolve {{why_suited:<name>}} first — its body is plain text, so newlines → <br>.
  body = body.replace(WHY_SUITED_RE_G, (match, name: string) => {
    const tpl = findWhySuited(whySuitedTemplates, name)
    return tpl ? toDisplayHtml(tpl.body) : match
  })

  const agentFirst = event?.agent_first_name ?? event?.agent_name?.split(' ')[0] ?? ''
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
    booking_details: bookingDetailsHtml,
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

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CopyIconButton({ onClick, copied, style }: { onClick: () => void; copied: boolean; style?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      title="Copy to clipboard"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', fontSize: 12, fontWeight: 500,
        background: copied ? '#276749' : 'var(--bg-secondary)',
        color: copied ? '#fff' : 'var(--text-secondary)',
        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
        cursor: 'pointer', fontFamily: 'var(--font)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        ...style,
      }}
    >
      <CopyIcon />
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export default function EmailComposer({ templates, whySuitedTemplates, whySuitedPrompt, enquiryEmail, event, quoteHtml, bookingDetailsHtml, quoteId }: Props) {
  const [selected, setSelected] = useState<EmailTemplate | null>(templates[0] ?? null)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  const filledHtml = useMemo(() => {
    if (!selected) return ''
    return fillTemplate(toDisplayHtml(selected.body), event, quoteHtml, bookingDetailsHtml, whySuitedTemplates)
  }, [selected, event, quoteHtml, bookingDetailsHtml, whySuitedTemplates])

  const filledSubject = useMemo(() => {
    if (!selected?.subject) return ''
    return fillTemplate(selected.subject, event, quoteHtml, bookingDetailsHtml, whySuitedTemplates)
  }, [selected, event, quoteHtml, bookingDetailsHtml, whySuitedTemplates])

  // Which blurb the Generate modal is currently using.
  const [promptWsId, setPromptWsId] = useState('')

  // If the selected template names one via {{why_suited:<name>}}, prefer that.
  const placeholderWsName = useMemo(() => {
    const m = selected?.body.match(WHY_SUITED_RE)
    return m ? m[1].trim() : null
  }, [selected])

  function openPrompt() {
    const match = placeholderWsName ? findWhySuited(whySuitedTemplates, placeholderWsName) : undefined
    setPromptWsId(match?.id ?? whySuitedTemplates[0]?.id ?? '')
    setPromptOpen(true)
  }

  const promptWsTpl = whySuitedTemplates.find(t => t.id === promptWsId) ?? null

  const generatedPrompt = useMemo(() => {
    if (!promptWsTpl) return ''
    return whySuitedPrompt
      .replace(/\{\{\s*why_suited\s*\}\}/gi, promptWsTpl.body)
      .replace(/\{\{\s*enquiry_email\s*\}\}/gi, enquiryEmail || '(no enquiry email on file)')
  }, [promptWsTpl, whySuitedPrompt, enquiryEmail])

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(generatedPrompt)
    } catch { /* ignore */ }
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

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
                <button
                  onClick={openPrompt}
                  style={{
                    padding: '7px 14px', fontSize: 12, fontWeight: 500,
                    background: 'var(--bg)', color: 'var(--text)',
                    border: '0.5px solid var(--border-hover)', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontFamily: 'var(--font)',
                  }}
                >
                  Generate custom why we’re suited
                </button>
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
                    background: copied ? '#276749' : 'var(--accent)', color: 'var(--accent-text-on)',
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
              <div style={{ maxWidth: 680, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
                  <CopyIconButton onClick={handleCopy} copied={copied} />
                </div>
                <div
                  style={{
                    background: '#fff', border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '32px 40px',
                    color: '#111',
                    ...gmailBodyStyle,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                  dangerouslySetInnerHTML={{ __html: filledHtml }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 12 }}>
                  <CopyIconButton onClick={handleCopy} copied={copied} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {promptOpen && (
        <div
          onClick={() => setPromptOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)', width: 'min(720px, 100%)',
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Generate custom why we’re suited</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Copy this prompt into ChatGPT, then paste its answer into the email.
                </div>
              </div>
              <button onClick={() => setPromptOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, lineHeight: 1, color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}>×</button>
            </div>

            <div style={{ padding: '16px 20px', overflowY: 'auto' }}>
              {whySuitedTemplates.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  No “Why we’re suited” blurbs exist yet. Create one in{' '}
                  <a href="/admin/settings" style={{ color: 'var(--text-info)' }}>Settings → Why we’re suited</a>.
                </p>
              ) : !whySuitedPrompt.trim() ? (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  No prompt wording set yet. Add it in{' '}
                  <a href="/admin/settings" style={{ color: 'var(--text-info)' }}>Settings → Why we’re suited</a> (the “ChatGPT prompt” box).
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Blurb</span>
                    <select
                      value={promptWsId}
                      onChange={e => setPromptWsId(e.target.value)}
                      style={{
                        flex: 1, height: 32, padding: '0 8px', fontSize: 13,
                        background: 'var(--bg-secondary)', color: 'var(--text)',
                        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        outline: 'none', fontFamily: 'var(--font)',
                      }}
                    >
                      {whySuitedTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    readOnly
                    value={generatedPrompt}
                    onFocus={e => e.currentTarget.select()}
                    style={{
                      width: '100%', minHeight: 320, boxSizing: 'border-box',
                      padding: '12px 14px', fontSize: 13, lineHeight: 1.6,
                      fontFamily: 'var(--font)', resize: 'vertical',
                      background: 'var(--bg-secondary)', color: 'var(--text)',
                      border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                      outline: 'none',
                    }}
                  />
                </>
              )}
            </div>

            {promptWsTpl && whySuitedPrompt.trim() && (
              <div style={{ padding: '12px 20px', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setPromptOpen(false)} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 500, background: 'transparent', color: 'var(--text-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Close</button>
                <button onClick={copyPrompt} style={{ padding: '8px 18px', fontSize: 12, fontWeight: 500, background: promptCopied ? '#276749' : 'var(--accent)', color: 'var(--accent-text-on)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  {promptCopied ? 'Copied!' : 'Copy prompt'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
