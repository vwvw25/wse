'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { EmailTemplate } from '@/types/quote'

const KNOWN_AUTO_FIELDS = new Set([
  'agent_name', 'agent_first_name', 'agency_name', 'event_date', 'venue_name',
  'location', 'start_time', 'finish_time', 'guests', 'event_type',
  // Missive-style aliases
  'name', 'date', 'NAME', 'DATE',
])

function highlightFields(text: string) {
  const parts = text.split(/(\{\{[^}]+\}\})/g)
  return parts.map((part, i) => {
    const match = part.match(/^\{\{(.+)\}\}$/)
    if (!match) return <span key={i}>{part}</span>
    const fieldName = match[1].trim()
    const isAuto = KNOWN_AUTO_FIELDS.has(fieldName)
    return (
      <span key={i} style={{
        background: isAuto ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
        color: isAuto ? 'var(--text-info)' : '#b45309',
        borderRadius: 3, padding: '0 2px', fontFamily: 'monospace', fontSize: 12,
      }}>
        {part}
      </span>
    )
  })
}

const BLANK: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'> = { name: '', subject: '', body: '' }

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selected, setSelected] = useState<EmailTemplate | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>>(BLANK)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)

  const supabase = createBrowserClient()

  const load = useCallback(async () => {
    const { data } = await supabase.from('email_templates').select('*').order('name')
    setTemplates((data ?? []) as EmailTemplate[])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  function startNew() {
    setSelected(null)
    setDraft(BLANK)
    setEditing(true)
    setIsNew(true)
  }

  function startEdit(t: EmailTemplate) {
    setSelected(t)
    setDraft({ name: t.name, subject: t.subject ?? '', body: t.body })
    setEditing(true)
    setIsNew(false)
  }

  async function handleSave() {
    if (!draft.name.trim() || !draft.body.trim()) return
    setSaving(true)
    try {
      if (isNew) {
        const { data } = await supabase
          .from('email_templates')
          .insert({ name: draft.name.trim(), subject: draft.subject || null, body: draft.body })
          .select('*').single()
        if (data) setSelected(data as EmailTemplate)
      } else if (selected) {
        await supabase
          .from('email_templates')
          .update({ name: draft.name.trim(), subject: draft.subject || null, body: draft.body, updated_at: new Date().toISOString() })
          .eq('id', selected.id)
        setSelected({ ...selected, ...draft, subject: draft.subject || null })
      }
      await load()
      setEditing(false)
      setIsNew(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(t: EmailTemplate) {
    if (!confirm(`Delete "${t.name}"?`)) return
    await supabase.from('email_templates').delete().eq('id', t.id)
    if (selected?.id === t.id) { setSelected(null); setEditing(false) }
    await load()
  }

  function handleCancel() {
    setEditing(false)
    setIsNew(false)
    if (isNew) setSelected(null)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', fontFamily: 'var(--font)', overflow: 'hidden' }}>

      {/* Left panel */}
      <div style={{
        width: 260, flexShrink: 0, borderRight: '0.5px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 14px 12px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{
                flex: 1, height: 32, padding: '0 10px', fontSize: 13,
                background: 'var(--bg-secondary)', color: 'var(--text)',
                border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                outline: 'none', fontFamily: 'var(--font)',
              }}
            />
          </div>
          <button
            onClick={startNew}
            style={{
              width: '100%', height: 32, fontSize: 12, fontWeight: 500,
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontFamily: 'var(--font)',
            }}
          >
            + New template
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '20px 14px', fontSize: 12, color: 'var(--text-tertiary)' }}>
              {search ? 'No matches' : 'No templates yet'}
            </div>
          ) : filtered.map(t => (
            <div
              key={t.id}
              onClick={() => { setSelected(t); setEditing(false); setIsNew(false) }}
              style={{
                padding: '10px 14px', cursor: 'pointer', borderBottom: '0.5px solid var(--border)',
                background: selected?.id === t.id ? 'var(--bg-info)' : 'transparent',
                transition: 'background 0.1s',
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

      {/* Right panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {!selected && !editing && (
          <div style={{ paddingTop: 60, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            Select a template or create a new one
          </div>
        )}

        {editing ? (
          <div style={{ maxWidth: 680 }}>
            <div style={{ marginBottom: 20 }}>
              <Label>Template name</Label>
              <input
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Agency WS"
                style={inputStyle}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <Label>Subject line <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></Label>
              <input
                value={draft.subject ?? ''}
                onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                placeholder="e.g. Ward Smith Entertainment — {{event_date}}"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Label>Body</Label>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                Auto-filled: <code style={{ fontSize: 11 }}>{'{{agent_first_name}}'}</code> <code style={{ fontSize: 11 }}>{'{{event_date}}'}</code> <code style={{ fontSize: 11 }}>{'{{venue_name}}'}</code> <code style={{ fontSize: 11 }}>{'{{agency_name}}'}</code> <code style={{ fontSize: 11 }}>{'{{start_time}}'}</code> <code style={{ fontSize: 11 }}>{'{{finish_time}}'}</code> <code style={{ fontSize: 11 }}>{'{{guests}}'}</code> — anything else will be prompted.
              </div>
              <textarea
                value={draft.body}
                onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                placeholder="Hi {{agent_first_name}},&#10;&#10;Hope you're well!&#10;&#10;We are currently free on {{event_date}}."
                style={{
                  width: '100%', minHeight: 320, padding: '12px 14px',
                  fontSize: 13, fontFamily: 'var(--font)', lineHeight: 1.7,
                  background: 'var(--bg-secondary)', color: 'var(--text)',
                  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={handleCancel} style={secondaryBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !draft.name.trim() || !draft.body.trim()} style={primaryBtn(saving || !draft.name.trim() || !draft.body.trim())}>
                {saving ? 'Saving…' : 'Save template'}
              </button>
            </div>
          </div>
        ) : selected ? (
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>{selected.name}</h2>
                {selected.subject && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Subject: {selected.subject}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => startEdit(selected)} style={secondaryBtn}>Edit</button>
                <button onClick={() => handleDelete(selected)} style={{ ...secondaryBtn, color: '#e53e3e', borderColor: '#e53e3e' }}>Delete</button>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(59,130,246,0.3)', marginRight: 4 }} />
              Auto-filled from event
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(245,158,11,0.3)', marginLeft: 12, marginRight: 4 }} />
              Prompted when generating
            </div>

            <div style={{
              background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '16px 20px',
              fontSize: 13, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap',
            }}>
              {highlightFields(selected.body)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>{children}</div>
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, padding: '0 12px', fontSize: 13,
  background: 'var(--bg-secondary)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box',
}

const secondaryBtn: React.CSSProperties = {
  padding: '8px 16px', fontSize: 12, fontWeight: 500,
  background: 'transparent', color: 'var(--text-secondary)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  cursor: 'pointer', fontFamily: 'var(--font)',
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 18px', fontSize: 12, fontWeight: 500,
    background: disabled ? 'var(--border)' : 'var(--accent)',
    color: disabled ? 'var(--text-tertiary)' : '#fff',
    border: 'none', borderRadius: 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)',
  }
}
