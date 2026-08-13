'use client'

import { useState, useTransition } from 'react'
import type { AvRider } from './actions'
import { createAvRider, updateAvRider, deleteAvRider } from './actions'

const inputBase: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--bg)', color: 'var(--text)',
  fontFamily: 'var(--font)', boxSizing: 'border-box',
}

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
}

async function viewFile(riderId: string) {
  const res = await fetch(`/api/admin/av-riders/${riderId}/file`)
  if (!res.ok) { alert('Could not load file'); return }
  const json = await res.json()
  if (json.url) window.open(json.url, '_blank')
}

function RiderForm({ initial, onSubmit, onCancel, submitLabel }: {
  initial?: AvRider
  onSubmit: (fd: FormData) => void
  onCancel?: () => void
  submitLabel: string
}) {
  const [removeFile, setRemoveFile] = useState(false)

  return (
    <form action={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={fieldLabel}>Name</label>
        <input name="name" defaultValue={initial?.name ?? ''} required placeholder="e.g. Corporate rider" style={inputBase} />
      </div>
      <div>
        <label style={fieldLabel}>Link</label>
        <input name="link_url" type="url" defaultValue={initial?.link_url ?? ''} placeholder="https://…" style={inputBase} />
      </div>
      <div>
        <label style={fieldLabel}>File (PDF, DOC, DOCX)</label>
        {initial?.file_name && !removeFile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Current: {initial.file_name}</span>
            <button type="button" onClick={() => setRemoveFile(true)} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 }}>Remove</button>
          </div>
        )}
        {removeFile && <input type="hidden" name="remove_file" value="1" />}
        <input name="file" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ ...inputBase, padding: '5px 8px' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}>{submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: 'transparent', color: 'var(--text-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancel</button>}
      </div>
    </form>
  )
}

function RiderRow({ rider }: { rider: AvRider }) {
  const [editing, setEditing] = useState(false)
  const [, startTransition] = useTransition()

  if (editing) {
    return (
      <div style={{ padding: 16, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}>
        <RiderForm
          initial={rider}
          onSubmit={fd => startTransition(async () => { await updateAvRider(rider.id, fd); setEditing(false) })}
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
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{rider.name}</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
            {rider.file_name && (
              <button onClick={() => viewFile(rider.id)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12 }}>
                📎 {rider.file_name}
              </button>
            )}
            {rider.link_url && (
              <a href={rider.link_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>🔗 Link</a>
            )}
            {!rider.file_name && !rider.link_url && <span style={{ color: 'var(--text-tertiary)' }}>No file or link</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setEditing(true)} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Edit</button>
          <button onClick={() => { if (confirm(`Delete "${rider.name}"?`)) startTransition(() => deleteAvRider(rider.id)) }} style={{ fontSize: 12, color: '#dc2626', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function AvRidersClient({ riders }: { riders: AvRider[] }) {
  const [creating, setCreating] = useState(false)
  const [, startTransition] = useTransition()

  return (
    <div style={{ padding: '32px', fontFamily: 'var(--font)', maxWidth: 600 }}>
      <div style={{ marginBottom: 8 }}>
        <a href="/admin/settings" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Settings</a>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>AV riders</h1>
        {!creating && (
          <button onClick={() => setCreating(true)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font)' }}>New rider</button>
        )}
      </div>
      {creating && (
        <div style={{ padding: 16, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)', marginBottom: 16 }}>
          <RiderForm
            onSubmit={fd => startTransition(async () => { await createAvRider(fd); setCreating(false) })}
            onCancel={() => setCreating(false)}
            submitLabel="Create rider"
          />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {riders.length === 0 && !creating && <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No riders yet.</p>}
        {riders.map(r => <RiderRow key={r.id} rider={r} />)}
      </div>
    </div>
  )
}
