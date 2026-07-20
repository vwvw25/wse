'use client'

import React, { useState, useTransition } from 'react'
import type { BandTemplate, BandTemplateSlot } from '@/types/musicians'
import { INSTRUMENTS } from '@/types/musicians'
import {
  createBandTemplate, renameBandTemplate, deleteBandTemplate,
  addTemplateSlot, deleteTemplateSlot,
} from '../musicians/actions'

const inputStyle: React.CSSProperties = {
  width: '100%', height: 34, padding: '0 10px', fontSize: 13, boxSizing: 'border-box',
  background: 'var(--bg-secondary)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none',
}
const primaryBtn: React.CSSProperties = {
  padding: '7px 18px', fontSize: 13, fontWeight: 500,
  background: 'var(--accent)', color: 'var(--accent-text-on)', border: 'none',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
}

interface Props {
  templates: (BandTemplate & { slots: BandTemplateSlot[] })[]
}

export default function BandTemplatesClient({ templates }: Props) {
  const [newName, setNewName] = useState('')
  const [editingName, setEditingName] = useState<Record<string, string>>({})
  const [newSlot, setNewSlot] = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    startTransition(async () => {
      await createBandTemplate(newName.trim())
      setNewName('')
    })
  }

  return (
    <div>
      <form onSubmit={handleCreateTemplate} style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        <input
          style={{ ...inputStyle, width: 240 }}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Template name, e.g. 3 Piece…"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          style={{ ...primaryBtn, opacity: !newName.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}
        >
          + Add template
        </button>
      </form>

      {templates.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          No templates yet. Create one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {templates.map(t => {
            const nameVal = editingName[t.id] ?? t.name
            const slotVal = newSlot[t.id] ?? ''

            return (
              <div key={t.id} style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)' }}>
                  <input
                    style={{ ...inputStyle, width: 200, height: 30 }}
                    value={nameVal}
                    onChange={e => setEditingName(prev => ({ ...prev, [t.id]: e.target.value }))}
                    onBlur={() => {
                      if (nameVal.trim() && nameVal !== t.name) {
                        startTransition(async () => { await renameBandTemplate(t.id, nameVal) })
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (nameVal.trim() && nameVal !== t.name) startTransition(async () => { await renameBandTemplate(t.id, nameVal) })
                      }
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t.slots.length} slot{t.slots.length !== 1 ? 's' : ''}</span>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => { if (confirm(`Delete template "${t.name}"?`)) startTransition(async () => deleteBandTemplate(t.id)) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-danger)', padding: '2px 8px', fontFamily: 'var(--font)' }}
                  >Delete</button>
                </div>

                <div style={{ padding: '10px 14px' }}>
                  {t.slots.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>No instruments — add one below.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {t.slots.map(slot => (
                        <div key={slot.id} style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px 3px 10px', borderRadius: 20, fontSize: 12,
                          background: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)',
                        }}>
                          {slot.instrument}
                          <button
                            onClick={() => { if (confirm(`Remove "${slot.instrument}" from template?`)) startTransition(async () => deleteTemplateSlot(slot.id)) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-tertiary)', padding: '0 2px', lineHeight: 1 }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={slotVal}
                      onChange={e => setNewSlot(prev => ({ ...prev, [t.id]: e.target.value }))}
                      style={{ ...inputStyle, width: 180, height: 30 }}
                    >
                      <option value="">Add instrument…</option>
                      {INSTRUMENTS.map(inst => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (!slotVal) return
                        startTransition(async () => { await addTemplateSlot(t.id, slotVal) })
                        setNewSlot(prev => ({ ...prev, [t.id]: '' }))
                      }}
                      disabled={!slotVal}
                      style={{
                        padding: '0 12px', fontSize: 13, height: 30,
                        background: 'var(--bg-secondary)', color: 'var(--text)',
                        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer', fontFamily: 'var(--font)',
                        opacity: !slotVal ? 0.5 : 1,
                      }}
                    >Add</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
