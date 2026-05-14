'use client'

import React, { useState, useTransition } from 'react'
import { createSetList } from '@/app/admin/set-lists/actions'
import { useRouter } from 'next/navigation'

type SetListRow = { id: string; name: string; created_at: string; song_count: number }

export default function SetListsTab({
  eventId,
  eventLabel,
  setLists,
}: {
  eventId: string
  eventLabel: string
  setLists: SetListRow[]
}) {
  const router = useRouter()
  const [creating, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [showForm, setShowForm] = useState(false)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    startTransition(async () => {
      const id = await createSetList({ name: name.trim(), event_id: eventId, is_template: false })
      if (id) router.push(`/admin/set-lists/${id}`)
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)',
            }}
          >
            + New set list
          </button>
        ) : (
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={`e.g. ${eventLabel} — Set 1`}
              style={{
                height: 34, padding: '0 10px', fontSize: 13, width: 260,
                background: 'var(--bg)', color: 'var(--text)',
                border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              disabled={!name.trim() || creating}
              style={{
                padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)',
                opacity: creating ? 0.6 : 1,
              }}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setName('') }}
              style={{
                padding: '7px 12px', fontSize: 13, cursor: 'pointer', background: 'none',
                color: 'var(--text-secondary)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)',
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {setLists.length === 0 ? (
        <div style={{
          padding: '40px 24px', textAlign: 'center',
          color: 'var(--text-tertiary)', fontSize: 13,
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
        }}>
          No set lists for this event yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {setLists.map(sl => (
            <a
              key={sl.id}
              href={`/admin/set-lists/${sl.id}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', textDecoration: 'none',
                border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
                background: 'var(--bg)',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{sl.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {sl.song_count} song{sl.song_count !== 1 ? 's' : ''} · {new Date(sl.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
