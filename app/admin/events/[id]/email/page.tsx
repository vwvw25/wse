'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import type { EventRecord, EmailTemplate } from '@/types/quote'

// Fields auto-filled from the event record
const AUTO_FILL: Record<string, (e: EventRecord) => string | null> = {
  agent_name:       e => e.agent_name,
  agent_first_name: e => e.agent_name?.split(' ')[0] ?? null,
  agency_name:      e => e.agency_name,
  event_date:       e => e.event_date ? formatDate(e.event_date) : null,
  venue_name:       e => e.venue_name,
  location:         e => e.location ?? e.venue_name,
  start_time:       e => e.start_time,
  finish_time:      e => e.finish_time,
  guests:           e => e.guests != null ? String(e.guests) : null,
  event_type:       e => e.event_type,
  // Missive-style aliases
  name:             e => e.agent_name?.split(' ')[0] ?? null,
  NAME:             e => e.agent_name?.split(' ')[0] ?? null,
  date:             e => e.event_date ? formatDate(e.event_date) : null,
  DATE:             e => e.event_date ? formatDate(e.event_date) : null,
}

function formatDate(d: string) {
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function extractPromptedFields(body: string, event: EventRecord): string[] {
  const matches = [...body.matchAll(/\{\{([^}]+)\}\}/g)]
  const prompted: string[] = []
  for (const m of matches) {
    const key = m[1].trim()
    const autoFn = AUTO_FILL[key]
    if (!autoFn || autoFn(event) === null) {
      if (!prompted.includes(key)) prompted.push(key)
    }
  }
  return prompted
}

function fillTemplate(body: string, event: EventRecord, extra: Record<string, string>): string {
  return body.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const k = key.trim()
    const autoFn = AUTO_FILL[k]
    if (autoFn) {
      const val = autoFn(event)
      if (val !== null) return val
    }
    return extra[k] ?? `{{${k}}}`
  })
}

function GenerateEmailContent() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selected, setSelected] = useState<EmailTemplate | null>(null)
  const [search, setSearch] = useState('')
  const [extraFields, setExtraFields] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const supabase = createBrowserClient()

  const load = useCallback(async () => {
    const [{ data: ev }, { data: tmpl }] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('email_templates').select('*').order('name'),
    ])
    if (ev) setEvent(ev as EventRecord)
    setTemplates((tmpl ?? []) as EmailTemplate[])
  }, [id, supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setExtraFields({})
    setCopied(false)
  }, [selected])

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  const promptedFields = event && selected
    ? extractPromptedFields(selected.body, event)
    : []

  const filled = event && selected
    ? fillTemplate(selected.body, event, extraFields)
    : null

  const filledSubject = event && selected?.subject
    ? fillTemplate(selected.subject, event, extraFields)
    : selected?.subject ?? null

  async function handleCopy() {
    if (!filled) return
    await navigator.clipboard.writeText(filled)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!event) return (
    <div style={{ padding: 32, fontSize: 13, color: 'var(--text-secondary)' }}>Loading…</div>
  )

  const eventTitle = event.agency_name
    ? (event.agent_name ? `${event.agent_name} at ${event.agency_name}` : event.agency_name)
    : event.agent_name ?? 'Event'

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', fontFamily: 'var(--font)', overflow: 'hidden' }}>

      {/* Left: template list */}
      <div style={{
        width: 240, flexShrink: 0, borderRight: '0.5px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 12px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 8 }}>
            Templates
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              width: '100%', height: 30, padding: '0 10px', fontSize: 12,
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t)}
              style={{
                padding: '9px 12px', cursor: 'pointer',
                borderBottom: '0.5px solid var(--border)',
                background: selected?.id === t.id ? 'var(--bg-info)' : 'transparent',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{t.name}</div>
              {t.subject && (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.subject}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--text-tertiary)' }}>
              {templates.length === 0 ? <><a href="/admin/templates" style={{ color: 'var(--accent)' }}>Create templates</a> first</> : 'No matches'}
            </div>
          )}
        </div>
      </div>

      {/* Right: preview + fill */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <a href={`/admin/events/${id}`} style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>← {eventTitle}</a>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: '8px 0 0', color: 'var(--text)' }}>
            {selected ? selected.name : 'Generate email'}
          </h1>
        </div>

        {!selected ? (
          <div style={{ paddingTop: 40, color: 'var(--text-tertiary)', fontSize: 13 }}>
            Pick a template from the left
          </div>
        ) : (
          <div style={{ maxWidth: 640 }}>
            {/* Prompted fields */}
            {promptedFields.length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 20,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Fill in
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                  {promptedFields.map(f => (
                    <div key={f}>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{f}</div>
                      <input
                        value={extraFields[f] ?? ''}
                        onChange={e => setExtraFields(prev => ({ ...prev, [f]: e.target.value }))}
                        style={{
                          width: '100%', height: 32, padding: '0 10px', fontSize: 13,
                          background: 'var(--bg)', color: 'var(--text)',
                          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                          outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subject */}
            {filledSubject && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Subject</div>
                <div style={{
                  padding: '8px 12px', fontSize: 13, color: 'var(--text)',
                  background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  {filledSubject}
                </div>
              </div>
            )}

            {/* Body */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Body</div>
              <div style={{
                background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '16px 20px',
                fontSize: 13, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap',
              }}>
                {filled}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleCopy}
                style={{
                  padding: '10px 22px', fontSize: 13, fontWeight: 500,
                  background: copied ? '#276749' : 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', fontFamily: 'var(--font)', transition: 'background 0.15s',
                }}
              >
                {copied ? 'Copied ✓' : 'Copy to clipboard'}
              </button>
              <a
                href="/admin/templates"
                style={{
                  padding: '10px 18px', fontSize: 13, fontWeight: 500,
                  background: 'transparent', color: 'var(--text-secondary)',
                  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                }}
              >
                Manage templates
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GenerateEmailPage() {
  return <Suspense><GenerateEmailContent /></Suspense>
}
