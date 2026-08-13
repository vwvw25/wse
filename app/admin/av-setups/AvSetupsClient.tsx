'use client'

import { useState, useTransition } from 'react'
import type { AvSetup } from './actions'
import { createAvSetup, updateAvSetup, deleteAvSetup } from './actions'

const inputBase: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--bg)', color: 'var(--text)',
  fontFamily: 'var(--font)', boxSizing: 'border-box',
}

function SetupForm({ initial, onSubmit, onCancel, submitLabel }: {
  initial?: AvSetup
  onSubmit: (fd: FormData) => void
  onCancel?: () => void
  submitLabel: string
}) {
  return (
    <form action={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Set up name</label>
        <input name="name" defaultValue={initial?.name ?? ''} required placeholder="e.g. Full dancefloor" style={inputBase} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}>{submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: 'transparent', color: 'var(--text-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancel</button>}
      </div>
    </form>
  )
}

function SetupRow({ setup }: { setup: AvSetup }) {
  const [editing, setEditing] = useState(false)
  const [, startTransition] = useTransition()

  if (editing) {
    return (
      <div style={{ padding: 16, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}>
        <SetupForm
          initial={setup}
          onSubmit={fd => startTransition(async () => { await updateAvSetup(setup.id, fd); setEditing(false) })}
          onCancel={() => setEditing(false)}
          submitLabel="Save"
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '12px 14px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{setup.name}</div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setEditing(true)} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Edit</button>
          <button onClick={() => { if (confirm(`Delete "${setup.name}"?`)) startTransition(() => deleteAvSetup(setup.id)) }} style={{ fontSize: 12, color: '#dc2626', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function AvSetupsClient({ setups }: { setups: AvSetup[] }) {
  const [creating, setCreating] = useState(false)
  const [, startTransition] = useTransition()

  return (
    <div style={{ padding: '32px', fontFamily: 'var(--font)', maxWidth: 600 }}>
      <div style={{ marginBottom: 8 }}>
        <a href="/admin/settings" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Settings</a>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>AV set ups</h1>
        {!creating && (
          <button onClick={() => setCreating(true)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font)' }}>New set up</button>
        )}
      </div>
      {creating && (
        <div style={{ padding: 16, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)', marginBottom: 16 }}>
          <SetupForm
            onSubmit={fd => startTransition(async () => { await createAvSetup(fd); setCreating(false) })}
            onCancel={() => setCreating(false)}
            submitLabel="Create set up"
          />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {setups.length === 0 && !creating && <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No set ups yet.</p>}
        {setups.map(s => <SetupRow key={s.id} setup={s} />)}
      </div>
    </div>
  )
}
