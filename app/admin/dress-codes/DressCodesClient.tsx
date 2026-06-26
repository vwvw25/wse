'use client'

import { useState, useTransition } from 'react'
import type { DressCodeTemplate } from './actions'
import { createDressCodeTemplate, updateDressCodeTemplate, deleteDressCodeTemplate } from './actions'

const inputBase: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--bg)', color: 'var(--text)',
  fontFamily: 'var(--font)', boxSizing: 'border-box',
}

function TemplateForm({ initial, onSubmit, onCancel, submitLabel }: {
  initial?: DressCodeTemplate
  onSubmit: (fd: FormData) => void
  onCancel?: () => void
  submitLabel: string
}) {
  return (
    <form action={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Template name</label>
        <input name="name" defaultValue={initial?.name ?? ''} required placeholder="e.g. Black tie" style={inputBase} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dress code</label>
        <textarea name="description" defaultValue={initial?.description ?? ''} rows={3} style={{ ...inputBase, resize: 'vertical', lineHeight: 1.5 }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}>{submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: 'transparent', color: 'var(--text-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancel</button>}
      </div>
    </form>
  )
}

function TemplateRow({ template }: { template: DressCodeTemplate }) {
  const [editing, setEditing] = useState(false)
  const [, startTransition] = useTransition()

  if (editing) {
    return (
      <div style={{ padding: 16, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}>
        <TemplateForm
          initial={template}
          onSubmit={fd => startTransition(async () => { await updateDressCodeTemplate(template.id, fd); setEditing(false) })}
          onCancel={() => setEditing(false)}
          submitLabel="Save"
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '12px 14px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: template.description ? 4 : 0 }}>{template.name}</div>
          {template.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{template.description}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setEditing(true)} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Edit</button>
          <button onClick={() => { if (confirm(`Delete "${template.name}"?`)) startTransition(() => deleteDressCodeTemplate(template.id)) }} style={{ fontSize: 12, color: 'var(--text-danger)', background: 'none', border: '0.5px solid var(--border-danger)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function DressCodesClient({ templates }: { templates: DressCodeTemplate[] }) {
  const [creating, setCreating] = useState(false)
  const [, startTransition] = useTransition()

  return (
    <div style={{ padding: '32px', fontFamily: 'var(--font)', maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Dress code templates</h1>
        {!creating && (
          <button onClick={() => setCreating(true)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font)' }}>New template</button>
        )}
      </div>
      {creating && (
        <div style={{ padding: 16, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)', marginBottom: 16 }}>
          <TemplateForm
            onSubmit={fd => startTransition(async () => { await createDressCodeTemplate(fd); setCreating(false) })}
            onCancel={() => setCreating(false)}
            submitLabel="Create template"
          />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {templates.length === 0 && !creating && <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No templates yet.</p>}
        {templates.map(t => <TemplateRow key={t.id} template={t} />)}
      </div>
    </div>
  )
}
