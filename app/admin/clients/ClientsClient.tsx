'use client'

import { useState, useTransition } from 'react'
import type { Client, ClientType } from '@/types/invoice'
import { upsertClient, deleteClient } from './actions'

const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  direct: 'Direct client',
  agency: 'Agency',
  event_planner: 'Event planner',
}

const inputStyle: React.CSSProperties = {
  height: 34, padding: '0 10px', fontSize: 13,
  background: 'var(--bg)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none', width: '100%', boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  padding: '8px 10px', fontSize: 13,
  background: 'var(--bg)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none', width: '100%', boxSizing: 'border-box',
  resize: 'vertical', minHeight: 60,
}

function ClientModal({
  client,
  onClose,
}: {
  client: Client | null
  onClose: () => void
}) {
  const [name, setName] = useState(client?.name ?? '')
  const [clientType, setClientType] = useState<ClientType>(client?.client_type ?? 'direct')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [address, setAddress] = useState(client?.address ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')
  const [, startTransition] = useTransition()

  function handleSave() {
    if (!name.trim()) return
    startTransition(async () => {
      await upsertClient({
        id: client?.id,
        name: name.trim(),
        client_type: clientType,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      })
      onClose()
    })
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
          border: '0.5px solid var(--border)',
          width: '100%', maxWidth: 480, padding: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px', color: 'var(--text)' }}>
          {client ? 'Edit client' : 'Add client'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Type</label>
            <select style={{ ...inputStyle, height: 34 }} value={clientType} onChange={e => setClientType(e.target.value as ClientType)}>
              <option value="direct">Direct client</option>
              <option value="agency">Agency</option>
              <option value="event_planner">Event planner</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Name *</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Client name" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Phone</label>
            <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44..." />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Address</label>
            <textarea style={textareaStyle} value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, Postcode" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea style={textareaStyle} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '7px 16px', fontSize: 13, background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font)' }}>Cancel</button>
          <button onClick={handleSave} disabled={!name.trim()} style={{ padding: '7px 16px', fontSize: 13, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: name.trim() ? 1 : 0.5, fontFamily: 'var(--font)', fontWeight: 500 }}>Save</button>
        </div>
      </div>
    </div>
  )
}

export default function ClientsClient({ clients }: { clients: Client[] }) {
  const [modal, setModal] = useState<Client | null | 'new'>(null)
  const [search, setSearch] = useState('')
  const [, startTransition] = useTransition()

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)', maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Clients</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Direct booking clients.</p>
        </div>
        <button
          onClick={() => setModal('new')}
          style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}
        >
          + Add client
        </button>
      </div>

      <input
        style={{ height: 34, padding: '0 10px', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)', outline: 'none', width: 260, marginBottom: 16 }}
        placeholder="Search clients…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          {search ? 'No clients match your search.' : 'No clients yet. Add one above.'}
        </div>
      ) : (
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                {['Name', 'Type', 'Email', 'Phone', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', paddingLeft: i === 0 ? 16 : 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px 10px 16px', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{CLIENT_TYPE_LABELS[c.client_type] ?? c.client_type}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{c.email ?? '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{c.phone ?? '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <button onClick={() => setModal(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', padding: '2px 6px', fontFamily: 'var(--font)' }}>Edit</button>
                    <button
                      onClick={() => { if (confirm(`Delete ${c.name}?`)) startTransition(async () => deleteClient(c.id)) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-danger)', padding: '2px 6px', fontFamily: 'var(--font)' }}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ClientModal
          client={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
